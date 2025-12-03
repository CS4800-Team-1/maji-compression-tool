import Head from "next/head";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ChevronDown } from "lucide-react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [compressedVideo, setCompressedVideo] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [targetSize, setTargetSize] = useState(9);
  
  // Verticalize feature states
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [shortsMode, setShortsMode] = useState('center-crop');
  
  // Audio normalization state
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  
  // Trim feature states
  const [enableTrim, setEnableTrim] = useState(false);
  const [trimStart, setTrimStart] = useState('00:00');
  const [trimEnd, setTrimEnd] = useState('00:00');
  
  // Smart center crop states
  const [enableCrop, setEnableCrop] = useState(false);
  const [cropPercentage, setCropPercentage] = useState(0);
  
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
    const targetSizeKB = targetSize * 1024; // Convert MB to KB
    const audioBitrate = 128; // Assume audio is ~128kbps
    const audioBudgetKB = (audioBitrate * videoDuration) / 8; // Audio size in KB
    const videoBudgetKB = targetSizeKB - audioBudgetKB; // Remaining budget for video
    const targetBitrate = Math.floor((videoBudgetKB * 8) / videoDuration); // kbps
    
    console.log(`Video duration: ${videoDuration}s, Target size: ${targetSize}MB, Calculated bitrate: ${targetBitrate}kbps`);
    
    // PASS 1: Video processing (trim, crop, aspect ratio)
    console.log('=== PASS 1: Video Processing ===');
    const ffmpegCommand = ['-i', 'input.webm'];
    
    // Add trim if enabled
    if (enableTrim && trimStart && trimEnd) {
      const startSeconds = timeStringToSeconds(trimStart);
      ffmpegCommand.push('-ss', startSeconds.toString());
      const endSeconds = timeStringToSeconds(trimEnd);
      const duration = Math.max(0, endSeconds - startSeconds);
      ffmpegCommand.push('-t', duration.toString());
    }
    
    // Build video filter chain - add crop before aspect ratio
    const videoFilters = [];
    
    // Add crop if enabled
    if (enableCrop && cropPercentage > 0) {
      videoFilters.push(buildCropFilter(cropPercentage));
    }
    
    // Add aspect ratio conversion
    const aspectRatioFilter = buildAspectRatioFilter();
    if (aspectRatioFilter) {
      videoFilters.push(aspectRatioFilter);
    }
    
    if (videoFilters.length > 0) {
      ffmpegCommand.push('-vf', videoFilters.join(','));
    }
    
    // Add video codec options - minimal and stable
    ffmpegCommand.push(
      '-c:v', 'libx264',
      '-b:v', `${targetBitrate}k`,
      '-preset', 'ultrafast'
    );
    
    // In Pass 1, always copy audio without processing to keep it stable
    ffmpegCommand.push('-c:a', 'copy');
    
    ffmpegCommand.push('pass1_output.mp4');
    
    console.log('Pass 1 FFmpeg command:', ffmpegCommand);
    
    let beg = new Date().getTime();
    await ffmpeg.exec(ffmpegCommand);
    let end = new Date().getTime();
    console.log(`Pass 1 took ${0.001*(end - beg)}s`);
    
    // PASS 2: Audio normalization (if enabled)
    if (normalizeAudio) {
      console.log('=== PASS 2: Audio Normalization ===');
      setProgress(50); // Indicate we're halfway through
      
      const pass2Command = ['-i', 'pass1_output.mp4'];
      
      // Apply only audio normalization, copy video as-is
      pass2Command.push(
        '-c:v', 'copy',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      );
      
      console.log('Pass 2 FFmpeg command:', pass2Command);
      
      beg = new Date().getTime();
      await ffmpeg.exec(pass2Command);
      end = new Date().getTime();
      console.log(`Pass 2 took ${0.001*(end - beg)}s`);
    } else {
      // If no audio normalization, just rename pass1 output to final output
      const data = await ffmpeg.readFile('pass1_output.mp4');
      await ffmpeg.writeFile('output.mp4', data);
    }
    
    const data = await ffmpeg.readFile('output.mp4');
    
    const blob = new Blob([data.buffer], {type: 'video/mp4'});
    const url = URL.createObjectURL(blob);
    
    setCompressedVideo(url);
    setCompressedSize(data.length);
    setProgress(100);
    
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

  // Helper function to get resolution dimensions based on aspect ratio
  const getResolutionDimensions = () => {
    const ratios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:3': { width: 1440, height: 1080 }
    };
    return ratios[aspectRatio] || ratios['16:9'];
  };

  // Helper function to build video filter graph for aspect ratio conversion
  const buildAspectRatioFilter = () => {
    if (aspectRatio === '16:9') {
      return 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    }
    
    if (aspectRatio === '9:16') {
      if (shortsMode === 'center-crop') {
        // Center crop to 1080x1920
        return 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(in_w-ow)/2:(in_h-oh)/2';
      } else {
        // Scale to fit with black padding
        return 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
      }
    }
    
    if (aspectRatio === '1:1') {
      return 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
    }
    
    if (aspectRatio === '4:3') {
      return 'scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2';
    }
    
    return null;
  };

  // Helper function to convert MM:SS or HH:MM:SS to seconds
  const timeStringToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Helper function to build center crop filter
  const buildCropFilter = (percentage) => {
    const cropAmount = percentage / 100;
    return `crop=w=in_w*(1-${cropAmount}):h=in_h*(1-${cropAmount}):x=in_w*${cropAmount/2}:y=in_h*${cropAmount/2}`;
  };

  return (
    <>
      <Head>
        <title>TinyVid - Video Compression Tool</title>
        <meta name="description" content="Compress your videos directly in your browser" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto p-4 md:p-8 text-center min-h-screen flex flex-col">
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-4">Video Compression Tool</h1>
          <p className="text-muted-foreground mb-8">
            Upload a video and compress it in your browser.
          </p>

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
                <div className="flex items-center gap-4">
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[targetSize || 1]}
                    onValueChange={(value) => setTargetSize(value[0])}
                    className="flex-1"
                  />
                  <Input
                    id="target-size"
                    type="number"
                    min="1"
                    max="100"
                    value={targetSize}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setTargetSize('');
                      } else {
                        const num = Number(val);
                        if (num >= 1 && num <= 100) {
                          setTargetSize(num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 1) {
                        setTargetSize(1);
                      }
                    }}
                    className="w-20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Video will be compressed to approximately {targetSize || 1} MB
                </p>
              </div>

              <Separator className="my-4" />

              {/* Trim Feature */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={enableTrim}
                    onChange={(e) => setEnableTrim(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Trim Video</p>
                    <p className="text-xs text-muted-foreground">Cut from start and/or end (MM:SS format)</p>
                  </div>
                </label>

                {enableTrim && (
                  <div className="space-y-2 pl-7">
                    <div>
                      <Label htmlFor="trim-start" className="text-xs font-medium">Start Time</Label>
                      <Input
                        id="trim-start"
                        type="text"
                        placeholder="00:00"
                        value={trimStart}
                        onChange={(e) => setTrimStart(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="trim-end" className="text-xs font-medium">End Time</Label>
                      <Input
                        id="trim-end"
                        type="text"
                        placeholder="00:00"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Smart Center Crop Feature */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={enableCrop}
                    onChange={(e) => setEnableCrop(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Smart Center Crop</p>
                    <p className="text-xs text-muted-foreground">Remove edges from center (applied before format)</p>
                  </div>
                </label>

                {enableCrop && (
                  <div className="space-y-2 pl-7">
                    <Label className="text-xs font-medium">Crop Amount: {cropPercentage}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={cropPercentage}
                      onChange={(e) => setCropPercentage(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">0% = no crop, 40% = removes 40% from edges</p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Verticalize Feature */}
              <div className="space-y-3">
                <Label htmlFor="aspect-ratio" className="text-sm font-semibold">📹 Video Format</Label>
                <div>
                  <Label htmlFor="aspect-ratio" className="text-xs text-muted-foreground mb-2 block">Aspect Ratio</Label>
                  <select
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait - Shorts/Reels)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Classic)</option>
                  </select>
                </div>

                {aspectRatio === '9:16' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Portrait Mode</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="shorts-mode"
                          value="center-crop"
                          checked={shortsMode === 'center-crop'}
                          onChange={(e) => setShortsMode(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">Center Crop - Cuts sides for full coverage</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="shorts-mode"
                          value="blur-scale"
                          checked={shortsMode === 'blur-scale'}
                          onChange={(e) => setShortsMode(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">Blur & Scale - Letterboxed with padding</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Audio Features */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">🔊 Audio</Label>
                
                {/* Loudness Normalization */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={normalizeAudio}
                    onChange={(e) => setNormalizeAudio(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Normalize Audio Levels</p>
                    <p className="text-xs text-muted-foreground">Standardizes audio for optimal platform playback</p>
                  </div>
                </label>
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
        </div>

        <footer className="mt-12 pb-8">
          <Button asChild variant="ghost" size="sm">
            <Link href="/team">Meet the Team</Link>
          </Button>
        </footer>
      </main>
    </>
  );
}