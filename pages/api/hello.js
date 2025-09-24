// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
  const name = req.query.name || "input";
  res.status(200).json({ greeting: `Hi ${name}` });
}
  