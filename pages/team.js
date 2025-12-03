import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Team() {
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
        <title>Meet the Team - Team MAJI</title>
        <meta name="description" content="CS4800 Team 1 - Meet the Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
            Video Compression Service
          </h1>
          <p className="text-muted-foreground mt-2">
            A project by Team MAJI for CS4800.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Meet the Team</CardTitle>
              <CardDescription>Click a button to get info about a team member.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => callApi('michael')}>Michael Ligayon</Button>
              <Button onClick={() => callApi('james')}>James Salac</Button>
              <Button onClick={() => callApi('andrew')}>Andrew Tarng</Button>
              <Button onClick={() => callApi('ian')}>Ian Chow</Button>
            </CardContent>
          </Card>

          {displayInfo && (
            <Card className="mb-8 bg-secondary">
              <CardHeader>
                <CardTitle>API Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono">{displayInfo}</p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link href="/">
                ← Back to Video Compression Tool
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
