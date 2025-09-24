import Head from "next/head";
import { useState } from "react";

export default function Home() {
  const [displayInfo, setDisplayInfo] = useState("");

  const callApi = async (endpoint) => {
    try {
      const response = await fetch(`/api/${endpoint}`);
      const data = await response.json();
      setDisplayInfo(`${data.name}: ${data.about}`);
    } catch (error) {
      setDisplayInfo(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>Team MAJI Video Compression Service</title>
        <meta name="description" content="CS4800 Team 1 API Demo" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Video Compression Service</h1>
        
        <div style={{ margin: '2rem 0' }}>
          <h3>Michael Ligayon</h3>
          <button onClick={() => callApi('michael')} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>
            Get Michael&apos;s Info
          </button>
        </div>

        <div style={{ margin: '2rem 0' }}>
          <h3>James Salac</h3>
          <button onClick={() => callApi('james')} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>
            Get James&apos;s Info
          </button>
        </div>

        <div style={{ margin: '2rem 0' }}>
          <h3>Andrew Tarng</h3>
          <button onClick={() => callApi('andrew')} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>
            Get Andrew&apos;s Info
          </button>
        </div>

        <div style={{ margin: '2rem 0' }}>
          <h3>Ian Chow</h3>
          <button onClick={() => callApi('ian')} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>
            Get Ian&apos;s Info
          </button>
        </div>

        <div style={{ margin: '2rem 0' }}>
          <h3>Hello API</h3>
          <button onClick={() => callApi('hello')} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>
            Call Hello API
          </button>
        </div>

        {displayInfo && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '5px',
            maxWidth: '500px',
            margin: '2rem auto'
          }}>
            <p>{displayInfo}</p>
          </div>
        )}
      </div>
    </>
  );
}
