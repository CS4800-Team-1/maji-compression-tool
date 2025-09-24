// HTTP API for Ian Chow
export default function handler(req, res) {
  res.status(200).json({ 
    name: "Ian Chow",
    about: "Senior CS student focusing on cloud"
  });
}
