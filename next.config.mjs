/** @type {import('next').NextConfig} */
const nextConfig = {
   experimental: {
    allowedDevOrigins: [
      'http://ec2-13-56-11-218.us-west-1.compute.amazonaws.com',
      // add other dev origins if needed
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key:'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
