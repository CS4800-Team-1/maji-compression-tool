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
  const [fileQueue, setFileQueue] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [compressedVideos, setCompressedVideos] = useState({});
  const [compressionStatus, setCompressionStatus] = useState('idle');
  const [targetSize, setTargetSize] = useState(9);
  
  // Get active file from queue
  const activeFile = fileQueue.find(f => f.id === activeFileId);
  
  // Helper to get current settings from active file
  const getActiveSetting = (setting, defaultValue) => {
    return activeFile?.settings[setting] ?? defaultValue;
  };
  
  // Helper to update settings for active file
  const updateActiveSetting = (setting, value) => {
    if (!activeFile) return;
    setFileQueue(prev => prev.map(f => 
      f.id === activeFileId 
        ? { ...f, settings: { ...f.settings, [setting]: value } }
        : f
    ));
  };
  
  // Platform selection state
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  
  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };
  
  const ffmpegRef = useRef(null);
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const newFiles = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      name: file.name,
      status: 'pending',
      compressedSize: 0,
      settings: {
        targetSize: 9,
        aspectRatio: '16:9',
        shortsMode: 'center-crop',
        normalizeAudio: false,
        enableTrim: false,
        trimStart: '00:00',
        trimEnd: '00:00',
        enableCrop: false,
        cropPercentage: 0
      }
    }));
    
    setFileQueue(prev => [...prev, ...newFiles]);
    
    // Set first newly added file as active
    if (newFiles.length > 0 && !activeFileId) {
      setActiveFileId(newFiles[0].id);
    }
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
    if (fileQueue.length === 0) return;
    
    setProgress(0);
    setProcessing(true);
    let filesProcessed = 0;
    
    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const ffmpeg = ffmpegRef.current;
      
      // Process each file in queue
      for (const fileItem of fileQueue) {
        console.log(`Processing file: ${fileItem.name}`);
        
        // Update file status to processing
        setFileQueue(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, status: 'processing' } : f)
        );
        
        const settings = fileItem.settings;
        let videoDuration = 0;
        
        // Write input file
        await ffmpeg.writeFile('input.webm', await fetchFile(fileItem.file));
        
        // Set up log handler for this file
        ffmpeg.on('log', ({ message }) => {
          const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (durationMatch && videoDuration === 0) {
            const [, hours, minutes, seconds] = durationMatch;
            videoDuration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
            setDuration(videoDuration);
            console.log(`Duration detected: ${videoDuration}s`);
          }
          
          const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (timeMatch && videoDuration > 0) {
            const [, hours, minutes, seconds] = timeMatch;
            const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
            const progressPercent = Math.min(100, (currentTime / videoDuration) * 100);
            const overallProgress = ((filesProcessed + (progressPercent / 100)) / fileQueue.length) * 100;
            setProgress(overallProgress);
          }
        });
        
        // Probe to get duration
        await ffmpeg.exec(['-i', 'input.webm']);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (videoDuration === 0) {
          videoDuration = duration || 60;
        }
        
        // Calculate target bitrate from settings
        const targetSizeKB = settings.targetSize * 1024;
        const audioBitrate = 128;
        const audioBudgetKB = (audioBitrate * videoDuration) / 8;
        const videoBudgetKB = targetSizeKB - audioBudgetKB;
        const targetBitrate = Math.floor((videoBudgetKB * 8) / videoDuration);
        
        console.log(`Processing ${fileItem.name}: Duration ${videoDuration}s, Target size ${settings.targetSize}MB, Bitrate ${targetBitrate}kbps`);
        
        // PASS 1: Video processing (trim, crop, aspect ratio)
        console.log('=== PASS 1: Video Processing ===');
        const ffmpegCommand = ['-i', 'input.webm'];
        
        // Add trim if enabled
        if (settings.enableTrim && settings.trimStart && settings.trimEnd) {
          const startSeconds = timeStringToSeconds(settings.trimStart);
          ffmpegCommand.push('-ss', startSeconds.toString());
          const endSeconds = timeStringToSeconds(settings.trimEnd);
          const trimDuration = Math.max(0, endSeconds - startSeconds);
          ffmpegCommand.push('-t', trimDuration.toString());
        }
        
        // Build video filter chain
        const videoFilters = [];
        
        // Add crop if enabled
        if (settings.enableCrop && settings.cropPercentage > 0) {
          videoFilters.push(buildCropFilterWithSettings(settings.cropPercentage));
        }
        
        // Add aspect ratio conversion
        const aspectRatioFilter = buildAspectRatioFilterWithSettings(settings.aspectRatio, settings.shortsMode);
        if (aspectRatioFilter) {
          videoFilters.push(aspectRatioFilter);
        }
        
        if (videoFilters.length > 0) {
          ffmpegCommand.push('-vf', videoFilters.join(','));
        }
        
        // Add video codec options
        ffmpegCommand.push(
          '-c:v', 'libx264',
          '-b:v', `${targetBitrate}k`,
          '-preset', 'ultrafast'
        );
        
        ffmpegCommand.push('-c:a', 'copy');
        ffmpegCommand.push('pass1_output.mp4');
        
        console.log('Pass 1 FFmpeg command:', ffmpegCommand);
        
        let beg = new Date().getTime();
        await ffmpeg.exec(ffmpegCommand);
        let end = new Date().getTime();
        console.log(`Pass 1 took ${0.001*(end - beg)}s`);
        
        // PASS 2: Audio normalization (if enabled)
        if (settings.normalizeAudio) {
          console.log('=== PASS 2: Audio Normalization ===');
          
          const pass2Command = ['-i', 'pass1_output.mp4'];
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
          const data = await ffmpeg.readFile('pass1_output.mp4');
          await ffmpeg.writeFile('output.mp4', data);
        }
        
        // Read and store compressed video
        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        // Store compressed video and update file status
        setCompressedVideos(prev => ({ ...prev, [fileItem.id]: url }));
        setFileQueue(prev =>
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'completed', compressedSize: data.length }
              : f
          )
        );
        
        // Cleanup FFmpeg workspace for next file
        try {
          await ffmpeg.deleteFile('input.webm');
          await ffmpeg.deleteFile('pass1_output.mp4');
          await ffmpeg.deleteFile('output.mp4');
        } catch (e) {
          console.log('Cleanup note:', e.message);
        }
        
        filesProcessed++;
      }
      
      setProgress(100);
    } catch (error) {
      console.error("Compression failed:", error);
      // Mark current file as failed
      setFileQueue(prev =>
        prev.map(f =>
          f.status === 'processing' ? { ...f, status: 'failed' } : f
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  const buildCropFilterWithSettings = (cropPercentage) => {
    const baseWidth = 1920;
    const baseHeight = 1080;
    
    const cropAmount = (cropPercentage / 100) * Math.min(baseWidth, baseHeight);
    const newWidth = baseWidth - (cropAmount * 2);
    const newHeight = baseHeight - (cropAmount * 2);
    
    const offsetX = Math.floor(cropAmount);
    const offsetY = Math.floor(cropAmount);
    
    return `crop=${Math.floor(newWidth)}:${Math.floor(newHeight)}:${offsetX}:${offsetY}`;
  };

  const buildAspectRatioFilterWithSettings = (aspectRatio, shortsMode) => {
    const ratios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:3': { width: 1440, height: 1080 },
    };
    
    const targetDims = ratios[aspectRatio] || ratios['16:9'];
    const shortsModeValue = shortsMode || 'center-crop';
    
    if (aspectRatio === '9:16' && shortsModeValue === 'blur-scale') {
      return `scale=${targetDims.width}:${targetDims.height}:force_original_aspect_ratio=decrease,pad=${targetDims.width}:${targetDims.height}:(ow-iw)/2:(oh-ih)/2:color=black`;
    } else {
      return `scale=${targetDims.width}:${targetDims.height}:force_original_aspect_ratio=increase,crop=${targetDims.width}:${targetDims.height}`;
    }
  };


  const downloadVideo = () => {
    if (!activeFile || !compressedVideos[activeFile.id]) return;
    
    const a = document.createElement('a');
    a.href = compressedVideos[activeFile.id];
    a.download = `compressed_${activeFile.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllVideos = async () => {
    if (Object.keys(compressedVideos).length === 0) return;
    
    // For simplicity, download each file individually
    for (const [fileId, url] of Object.entries(compressedVideos)) {
      const file = fileQueue.find(f => f.id === fileId);
      if (file && url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${file.name || 'video.mp4'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const downloadVideoOnly = async () => {
    if (!activeFile || !compressedVideos[activeFile.id]) return;
    
    try {
      const ffmpeg = ffmpegRef.current;
      
      // Create a temporary blob URL for the compressed video
      const response = await fetch(compressedVideos[activeFile.id]);
      const blob = await response.blob();
      
      // Write to ffmpeg filesystem
      await ffmpeg.writeFile('temp_video.mp4', new Uint8Array(await blob.arrayBuffer()));
      
      // Extract video without audio
      await ffmpeg.exec([
        '-i', 'temp_video.mp4',
        '-c:v', 'copy',
        '-an',
        'video_only.mp4'
      ]);
      
      const videoOnlyData = await ffmpeg.readFile('video_only.mp4');
      const videoOnlyBlob = new Blob([videoOnlyData.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoOnlyBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_only_${activeFile.name || 'video.mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup
      await ffmpeg.deleteFile('temp_video.mp4');
      await ffmpeg.deleteFile('video_only.mp4');
    } catch (error) {
      console.error("Error downloading video only:", error);
    }
  };

  const downloadAudioOnly = async () => {
    if (!activeFile || !compressedVideos[activeFile.id]) return;
    
    try {
      const ffmpeg = ffmpegRef.current;
      
      // Create a temporary blob URL for the compressed video
      const response = await fetch(compressedVideos[activeFile.id]);
      const blob = await response.blob();
      
      // Write to ffmpeg filesystem
      await ffmpeg.writeFile('temp_video.mp4', new Uint8Array(await blob.arrayBuffer()));
      
      // Extract audio and convert to MP3
      await ffmpeg.exec([
        '-i', 'temp_video.mp4',
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        'audio_only.mp3'
      ]);
      
      const audioOnlyData = await ffmpeg.readFile('audio_only.mp3');
      const audioOnlyBlob = new Blob([audioOnlyData.buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioOnlyBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_only_${activeFile.name.split('.')[0] || 'audio'}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup
      await ffmpeg.deleteFile('temp_video.mp4');
      await ffmpeg.deleteFile('audio_only.mp3');
    } catch (error) {
      console.error("Error downloading audio only:", error);
    }
  };

  // Helper function to get resolution dimensions based on aspect ratio
  const getResolutionDimensions = () => {
    const ratios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:3': { width: 1440, height: 1080 }
    };
    return ratios[getActiveSetting('aspectRatio', '16:9')] || ratios['16:9'];
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
          <h1 className="text-4xl font-bold mb-4">TinyVid Compression Tool for Creators</h1>
          <p className="text-muted-foreground mb-8">
            A lightweight, easy to use video compression tool with several features that work directly in your browser!
          </p>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>1. Video Configuration</CardTitle>
              <CardDescription>Select one or multiple video files from your device.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-center">
              {/* The actual file input is hidden */}
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                data-testid="file-input"
                className="hidden"
              />
              {/* This label acts as the visible button */}
              <Label
                htmlFor="video-file"
                className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
              >
                Choose Files
              </Label>
              
              {/* File Queue Tabs */}
              {fileQueue.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-left mb-2">Queue ({fileQueue.length})</div>
                  <div className="border-b overflow-x-auto">
                    <div className="flex gap-1">
                      {fileQueue.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setActiveFileId(f.id)}
                          className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                            activeFileId === f.id
                              ? 'border-black text-black bg-gray-50'
                              : 'border-transparent text-gray-600 hover:text-black'
                          }`}
                          title={f.name}
                        >
                          {f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {activeFile && (
                    <div className="text-sm text-muted-foreground pt-2 bg-gray-50 p-3 rounded">
                      <p>File: {activeFile.name}</p>
                      <p>Size: {(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p className="text-xs mt-1">Status: {activeFile.status}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFileQueue(prev => prev.filter(f => f.id !== activeFileId));
                        setCompressedVideos(prev => {
                          const updated = { ...prev };
                          delete updated[activeFileId];
                          return updated;
                        });
                        
                        if (fileQueue.length === 1) {
                          setActiveFileId(null);
                        } else {
                          setActiveFileId(fileQueue.find(f => f.id !== activeFileId)?.id || null);
                        }
                      }}
                      className="text-xs"
                    >
                      Remove File
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setFileQueue([]);
                        setCompressedVideos({});
                        setActiveFileId(null);
                      }}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No videos queued</p>
                  <p className="text-xs mt-1">Click &quot;Choose Files&quot; to get started</p>
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
                    value={[getActiveSetting('targetSize', targetSize) || 1]}
                    onValueChange={(value) => updateActiveSetting('targetSize', value[0])}
                    className="flex-1"
                    disabled={!activeFile}
                  />
                  <Input
                    id="target-size"
                    type="number"
                    min="1"
                    max="100"
                    value={getActiveSetting('targetSize', targetSize)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        updateActiveSetting('targetSize', '');
                      } else {
                        const num = Number(val);
                        if (num >= 1 && num <= 100) {
                          updateActiveSetting('targetSize', num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 1) {
                        updateActiveSetting('targetSize', 1);
                      }
                    }}
                    disabled={!activeFile}
                    className="w-20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Video will be compressed to approximately {getActiveSetting('targetSize', targetSize) || 1} MB
                </p>
              </div>

              <Separator className="my-4" />

              {/* Trim Feature */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={getActiveSetting('enableTrim', false)}
                    onChange={(e) => updateActiveSetting('enableTrim', e.target.checked)}
                    disabled={!activeFile}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Trim Video</p>
                    <p className="text-xs text-muted-foreground">Cut from start and/or end (MM:SS format)</p>
                  </div>
                </label>

                {getActiveSetting('enableTrim', false) && (
                  <div className="space-y-2 pl-7">
                    <div>
                      <Label htmlFor="trim-start" className="text-xs font-medium">Start Time</Label>
                      <Input
                        id="trim-start"
                        type="text"
                        placeholder="00:00"
                        value={getActiveSetting('trimStart', '00:00')}
                        onChange={(e) => updateActiveSetting('trimStart', e.target.value)}
                        disabled={!activeFile}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="trim-end" className="text-xs font-medium">End Time</Label>
                      <Input
                        id="trim-end"
                        type="text"
                        placeholder="00:00"
                        value={getActiveSetting('trimEnd', '00:00')}
                        onChange={(e) => updateActiveSetting('trimEnd', e.target.value)}
                        disabled={!activeFile}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Smart Center Crop Feature - Work on after presentation */}
              {/* <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={getActiveSetting('enableCrop', false)}
                    onChange={(e) => updateActiveSetting('enableCrop', e.target.checked)}
                    disabled={!activeFile}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Smart Center Crop</p>
                    <p className="text-xs text-muted-foreground">Remove edges from center (applied before format)</p>
                  </div>
                </label>

                {getActiveSetting('enableCrop', false) && (
                  <div className="space-y-2 pl-7">
                    <Label className="text-xs font-medium">Crop Amount: {getActiveSetting('cropPercentage', 0)}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={getActiveSetting('cropPercentage', 0)}
                      onChange={(e) => updateActiveSetting('cropPercentage', Number(e.target.value))}
                      disabled={!activeFile}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">0% = no crop, 40% = removes 40% from edges</p>
                  </div>
                )}
              </div> */}

              <Separator className="my-4" />

              {/* Verticalize Feature */}
              <div className="space-y-3">
                <Label htmlFor="aspect-ratio" className="text-sm font-semibold">Video Format</Label>
                <div>
                  <Label htmlFor="aspect-ratio" className="text-xs text-muted-foreground mb-2 block">Aspect Ratio</Label>
                  <select
                    id="aspect-ratio"
                    value={getActiveSetting('aspectRatio', '16:9')}
                    onChange={(e) => updateActiveSetting('aspectRatio', e.target.value)}
                    disabled={!activeFile}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait - Shorts/Reels)</option>
                  </select>
                </div>

                {getActiveSetting('aspectRatio', '16:9') === '9:16' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Portrait Mode</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="shorts-mode"
                          value="center-crop"
                          checked={getActiveSetting('shortsMode', 'center-crop') === 'center-crop'}
                          onChange={(e) => updateActiveSetting('shortsMode', e.target.value)}
                          disabled={!activeFile}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">Center Crop - Cuts sides for full coverage</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="shorts-mode"
                          value="blur-scale"
                          checked={getActiveSetting('shortsMode', 'center-crop') === 'blur-scale'}
                          onChange={(e) => updateActiveSetting('shortsMode', e.target.value)}
                          disabled={!activeFile}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">Scaling - Turn landscape videos into TikTok-friendly video formats</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Audio Features */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Audio</Label>
                
                {/* Loudness Normalization  */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={getActiveSetting('normalizeAudio', false)}
                    onChange={(e) => updateActiveSetting('normalizeAudio', e.target.checked)}
                    disabled={!activeFile}
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
              <CardTitle>2. Compress Videos</CardTitle>
              <CardDescription>
                {!loaded ? "Loading FFmpeg..." : `Ready to process ${fileQueue.length} video${fileQueue.length !== 1 ? 's' : ''}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button 
                onClick={processVideo} 
                disabled={fileQueue.length === 0 || processing || !loaded}
              >
                {processing ? 'Processing...' : !loaded ? 'Loading FFmpeg...' : `Compress All (${fileQueue.length})`}
              </Button>
              {processing && <Progress value={progress} className="w-full" />}
              
              {/* File Processing Status */}
              {fileQueue.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fileQueue.map(file => (
                    <div 
                      key={file.id} 
                      className="text-xs p-2 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => file.status === 'completed' && setActiveFileId(file.id)}
                    >
                      <span className="font-medium">{file.name.substring(0, 30)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        file.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                        file.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        file.status === 'completed' ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Download Section */}
              {Object.keys(compressedVideos).length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold">Compressed Videos: {Object.keys(compressedVideos).length}/{fileQueue.length}</p>
                  
                  {activeFile && compressedVideos[activeFile.id] && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        <p>Current: {activeFile.name}</p>
                        <p>Size: {(activeFile.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button 
                        onClick={downloadVideo} 
                        variant="outline"
                        className="w-full"
                      >
                        Download Current Video
                      </Button>
                      
                      {/* Mini Download Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={downloadVideoOnly}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Video Only
                        </Button>
                        <Button
                          onClick={downloadAudioOnly}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Audio Only
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {Object.keys(compressedVideos).length > 1 && (
                    <Button 
                      onClick={downloadAllVideos} 
                      variant="default"
                      className="w-full"
                    >
                      Download All Videos
                    </Button>
                  )}
                </div>
              )}
              
              <p ref={messageRef} className="text-xs text-muted-foreground h-8 overflow-y-auto border rounded-md p-2 bg-slate-50"></p>
            </CardContent>
          </Card>
        </div>
        </div>

        <div className="flex justify-center max-w-4xl mx-auto w-full mt-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>3. Upload Video (Work In Progress) </CardTitle>
              <CardDescription>Select your platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-3">
                {/* TikTok Platform */}
                <button
                  onClick={() => togglePlatform('tiktok')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedPlatforms.includes('tiktok')
                      ? 'border-black bg-gray-200'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium text-sm">TikTok</p>
                </button>

                {/* YouTube Platform */}
                <button
                  onClick={() => togglePlatform('youtube')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedPlatforms.includes('youtube')
                      ? 'border-black bg-gray-200'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium text-sm">YouTube</p>
                </button>

                {/* Instagram Platform */}
                <button
                  onClick={() => togglePlatform('instagram')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedPlatforms.includes('instagram')
                      ? 'border-black bg-gray-200'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium text-sm">Instagram</p>
                </button>
              </div>

              <Button
                disabled={selectedPlatforms.length === 0}
                className="w-full"
              >
                Upload
              </Button>
            </CardContent>
          </Card>
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