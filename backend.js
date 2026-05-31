const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'salon.html'));
});

const resend = new Resend('re_efPgyhjs_QBvRnVrLLB6RW57ScNUkRgib');

const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

function loadBookings() {
  if (!fs.existsSync(BOOKINGS_FILE)) return [];
  return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

const allSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];

app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  const bookings = loadBookings();
  const bookedSlots = bookings.filter(b => b.date === date).map(b => b.heure);
  const available = allSlots.filter(s => !bookedSlots.includes(s));
  res.json({ available });
});

app.post('/api/reservation', async (req, res) => {
  const { prenom, nom, tel, service, date, heure } = req.body;
  console.log('Réservation reçue :', { prenom, nom, tel, service, date, heure });

  const bookings = loadBookings();
  const alreadyBooked = bookings.some(b => b.date === date && b.heure === heure);
  if (alreadyBooked) {
    return res.status(409).json({ success: false, error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' });
  }

  bookings.push({ prenom, nom, tel, service, date, heure });
  saveBookings(bookings);

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'dangboemaurice@gmail.com',
      subject: `Nouvelle réservation — ${prenom} ${nom}`,
      html: `
        <h2>Nouvelle réservation</h2>
        <p><strong>Nom :</strong> ${prenom} ${nom}</p>
        <p><strong>Téléphone :</strong> ${tel}</p>
        <p><strong>Service :</strong> ${service}</p>
        <p><strong>Date :</strong> ${date}</p>
        <p><strong>Heure :</strong> ${heure}</p>
      `
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Serveur backend démarré sur http://localhost:' + PORT);
});
