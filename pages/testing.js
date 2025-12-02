import Head from "next/head";
import { useState, useRef } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function Testing() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const ffmpegRef = useRef(null);
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const parseDuration = (message) => {
    const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (durationMatch) {
      const [, hours, minutes, seconds, milliseconds] = durationMatch;
      const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100;
      setDuration(totalSeconds);
      return totalSeconds;
    }
    return null;
  };

  const parseProgress = (message, videoDuration) => {
    if (!videoDuration) return;
    const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes, seconds, milliseconds] = timeMatch;
      const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100;
      setProgress(Math.min(100, (currentTime / videoDuration) * 100));
    }
  };

  const loadFFmpeg = async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd';
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;
    
    ffmpeg.on('log', ({ message }) => {
      let localDuration = duration;
      if (localDuration === 0) {
        localDuration = parseDuration(message);
      }
      parseProgress(message, localDuration);

      if (messageRef.current) {
        messageRef.current.innerHTML = message;
      }
    });
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    setLoaded(true);
  };

  const processVideo = async () => {
    if (!selectedFile) return;
    
    setProgress(0);
    setDuration(0);
    setProcessing(true);
    try {
    const { fetchFile } = await import('@ffmpeg/util');
    const ffmpeg = ffmpegRef.current;
    
    await ffmpeg.writeFile('input.webm', await fetchFile(selectedFile));
    const beg = new Date().getTime();
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',      // H.264 codec
      '-crf', '28',            // Higher CRF = smaller file (18-28 recommended)
      '-preset', 'fast',       // Encoding speed (ultrafast, fast, medium, slow)
      '-c:a', 'copy',          // Copy audio stream to prevent hanging
      'output.mp4'
    ]);
    const end = new Date().getTime();
    console.log(0.001*(end - beg));
    const data = await ffmpeg.readFile('output.mp4');
    
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(new Blob([data.buffer], {type: 'video/mp4'}));
    }
  }
  catch (error) {
      console.error("Compression failed:", error);
      if (messageRef.current) {
        messageRef.current.innerHTML = "An error occurred during compression.";
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Testing - Video Upload & Processing</title>
        <meta name="description" content="Video upload and processing testing page" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto p-4 md:p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Video Compression Testing</h1>
        <p className="text-muted-foreground mb-8">
          Upload a video, load FFmpeg, and process it in your browser.
        </p>
        <Button asChild variant="link" className="mb-8">
          <Link href="/">← Back to Home</Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>1. Upload Video</CardTitle>
              <CardDescription>Select a video file from your device.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-center">
              {/* The actual file input is hidden */}
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                data-testid="file-input"
                className="hidden"
              />
              {/* This label acts as the visible button */}
              <Label
                htmlFor="video-file"
                className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
              >
                Choose File
              </Label>
              {selectedFile && (
                <div className="text-sm text-muted-foreground pt-2">
                  <p>Selected: {selectedFile.name}</p>
                  <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Compress Video</CardTitle>
              <CardDescription>
                {!loaded ? "Load the FFmpeg library first." : "Process the selected video."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!loaded ? (
                <Button onClick={loadFFmpeg}>Load FFmpeg (~31 MB)</Button>
              ) : (
                <>
                  <Button onClick={processVideo} disabled={!selectedFile || processing}>
                    {processing ? 'Processing...' : 'Process Video'}
                  </Button>
                  {processing && <Progress value={progress} className="w-full" />}
                </>
              )}
              <div className="mt-4">
                <video ref={videoRef} controls className="w-full rounded-md bg-muted"></video>
              </div>
              <p ref={messageRef} className="text-xs text-muted-foreground h-8 overflow-y-auto border rounded-md p-2 bg-slate-50"></p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}