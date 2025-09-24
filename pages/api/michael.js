// HTTP API for Michael Ligayon

export default function handler(req, res) {
  res.status(200).json({ 
    name: "Michael Ligayon",
    about: "4th year Computer Science Student. Really likes traveling and eating cheese!"
  });
}