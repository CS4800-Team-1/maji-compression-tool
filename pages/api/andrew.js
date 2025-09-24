// HTTP API for Andrew Tarng
export default function handler(req, res) {
  res.status(200).json({ 
    name: "Andrew Tarng",
    about: "Senior CS student focusing on cybersecurity. Enjoys life"
  });
}
