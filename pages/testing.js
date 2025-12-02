import Head from "next/head";
import { useState, useRef, useEffect } from "react";
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
  const [compressedVideo, setCompressedVideo] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [targetSize, setTargetSize] = useState(9);
  const ffmpegRef = useRef(null);
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  // Auto-load FFmpeg when component mounts
  useEffect(() => {
    loadFFmpeg();
  }, []);

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
    setProcessing(true);
    let videoDuration = 0;
    
    try {
    const { fetchFile } = await import('@ffmpeg/util');
    const ffmpeg = ffmpegRef.current;
    
    await ffmpeg.writeFile('input.webm', await fetchFile(selectedFile));
    
    // Set up log handler to capture duration and progress
    ffmpeg.on('log', ({ message }) => {
      // Capture duration
      const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch && videoDuration === 0) {
        const [, hours, minutes, seconds] = durationMatch;
        videoDuration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        setDuration(videoDuration);
        console.log(`Duration detected: ${videoDuration}s`);
      }
      
      // Capture progress during encoding
      const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch && videoDuration > 0) {
        const [, hours, minutes, seconds] = timeMatch;
        const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        const progressPercent = Math.min(100, (currentTime / videoDuration) * 100);
        setProgress(progressPercent);
      }
    });
    
    // Run probe to get duration
    await ffmpeg.exec(['-i', 'input.webm']);
    
    // Wait a moment for duration to be captured
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use captured duration or fallback
    if (videoDuration === 0) {
      videoDuration = duration || 60; // fallback to 60 seconds if still not available
    }
    
    // Calculate target bitrate based on target file size
    // Formula: bitrate (kbps) = (target size in MB * 8192) / duration in seconds
    // Account for audio (assume ~128kbps) and subtract from video budget
    const targetSizeKB = targetSize * 1024; // Convert MB to KB
    const audioBitrate = 128; // Assume audio is ~128kbps (we're copying it)
    const audioBudgetKB = (audioBitrate * videoDuration) / 8; // Audio size in KB
    const videoBudgetKB = targetSizeKB - audioBudgetKB; // Remaining budget for video
    const targetBitrate = Math.floor((videoBudgetKB * 8) / videoDuration); // kbps
    
    console.log(`Video duration: ${videoDuration}s, Target size: ${targetSize}MB, Calculated bitrate: ${targetBitrate}kbps`);
    
    const beg = new Date().getTime();
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',      // H.264 codec
      '-b:v', `${targetBitrate}k`,  // Target video bitrate
      '-maxrate', `${targetBitrate}k`, // Maximum bitrate
      '-bufsize', `${targetBitrate * 2}k`, // Buffer size
      '-preset', 'ultrafast',       // Encoding speed (ultrafast, fast, medium, slow)
      '-c:a', 'copy',          // Copy audio stream to prevent hanging
      'output.mp4'
    ]);
    const end = new Date().getTime();
    console.log(0.001*(end - beg));
    const data = await ffmpeg.readFile('output.mp4');
    
    const blob = new Blob([data.buffer], {type: 'video/mp4'});
    const url = URL.createObjectURL(blob);
    
    setCompressedVideo(url);
    setCompressedSize(data.length);
    
    if (videoRef.current) {
      videoRef.current.src = url;
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

  const downloadVideo = () => {
    if (!compressedVideo) return;
    
    const a = document.createElement('a');
    a.href = compressedVideo;
    a.download = `compressed_${selectedFile?.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              <Separator className="my-2" />
              <div className="space-y-2">
                <Label htmlFor="target-size">Target File Size (MB)</Label>
                <Input
                  id="target-size"
                  type="number"
                  min="1"
                  max="100"
                  value={targetSize}
                  onChange={(e) => setTargetSize(Number(e.target.value))}
                  placeholder="9"
                />
                <p className="text-xs text-muted-foreground">
                  Video will be compressed to approximately {targetSize} MB
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Compress Video</CardTitle>
              <CardDescription>
                {!loaded ? "Loading FFmpeg..." : "Ready to process your video."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button onClick={processVideo} disabled={!selectedFile || processing || !loaded}>
                {processing ? 'Processing...' : !loaded ? 'Loading FFmpeg...' : 'Process Video'}
              </Button>
              {processing && <Progress value={progress} className="w-full" />}
              <div className="mt-4">
                <video ref={videoRef} controls className="w-full rounded-md bg-muted"></video>
              </div>
              <Button 
                onClick={downloadVideo} 
                disabled={!compressedVideo}
                variant="outline"
              >
                {compressedVideo 
                  ? `Download Compressed Video (${(compressedSize / 1024 / 1024).toFixed(2)} MB)`
                  : 'Download Compressed Video'
                }
              </Button>
              <p ref={messageRef} className="text-xs text-muted-foreground h-8 overflow-y-auto border rounded-md p-2 bg-slate-50"></p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}