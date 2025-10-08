import Head from "next/head";
import { useState, useRef } from "react";
import Link from "next/link";

export default function Testing() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const ffmpegRef = useRef(null);
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const loadFFmpeg = async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd';
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;
    
    ffmpeg.on('log', ({ message }) => {
      if (messageRef.current) {
        messageRef.current.innerHTML = message;
      }
      console.log(message);
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
      '-preset', 'ultrafast',       // Encoding speed (ultrafast, fast, medium, slow)
      '-c:a', 'aac',          // Audio codec
      '-b:a', '128k',         // Audio bitrate
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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Video Upload & Processing Testing</h1>
        
        <Link href="/" style={{ 
          color: '#0070f3', 
          textDecoration: 'underline',
          marginBottom: '2rem',
          display: 'inline-block'
        }}>
          ← Back to Home
        </Link>

        <div style={{ margin: '3rem 0' }}>
          <h2>Upload Video</h2>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            data-testid="file-input"
            style={{ margin: '1rem 0' }}
          />
          {selectedFile && (
            <div style={{ margin: '1rem 0' }}>
              <p>Selected: {selectedFile.name}</p>
              <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>

        <div style={{ margin: '3rem 0', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
          <h2>Video Compression</h2>
          {!loaded ? (
            <button onClick={loadFFmpeg} style={{ margin: '1rem', padding: '0.5rem 1rem' }}>
              Load FFmpeg (~31 MB)
            </button>
          ) : (
            <div>
              <button 
                onClick={processVideo} 
                disabled={!selectedFile || processing}
                style={{ margin: '1rem', padding: '0.5rem 1rem' }}
              >
                {processing ? 'Processing...' : 'Process Video'}
              </button>
              <div style={{ margin: '2rem 0' }}>
                <video ref={videoRef} controls style={{ maxWidth: '500px' }}></video>
              </div>
              <p ref={messageRef} style={{ fontSize: '0.8rem', color: '#666' }}></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}