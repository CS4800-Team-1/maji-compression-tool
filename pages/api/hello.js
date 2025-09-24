// A3 P3 (Individual) Michael Ligayon HTTP API

export default function handler(req, res) {
  const name = req.query.name || "input";
  res.status(200).json({ greeting: `Hi ${name}` });
}
  