import Head from "next/head";
import { useState } from "react";
import Link from "next/link";

export default function Testing() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  return (
    <>
      <Head>
        <title>Testing - Video Upload</title>
        <meta name="description" content="Video upload testing page" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Video Upload Testing</h1>
        
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
            style={{ margin: '1rem 0' }}
          />
          {selectedFile && (
            <div style={{ margin: '1rem 0' }}>
              <p>Selected: {selectedFile.name}</p>
              <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}