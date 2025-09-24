// James Salac HTTP API

export default function handler(req, res) {
  res.status(200).json({ 
    name: "James Salac",
    about: "Computer Science student passionate about web development and software engineering. Enjoys working on team projects!"
  });
}