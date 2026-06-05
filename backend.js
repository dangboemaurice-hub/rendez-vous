const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'salon.html'));
});

const resend = new Resend('re_efPgyhjs_QBvRnVrLLB6RW57ScNUkRgib');

const bookings = [];
const sseClients = [];

const allSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  const bookedSlots = bookings.filter(b => b.date === date).map(b => b.heure);
  const available = allSlots.filter(s => !bookedSlots.includes(s));
  res.json({ available });
});

app.post('/api/reservation', async (req, res) => {
  const { prenom, nom, tel, email, service, date, heure } = req.body;
  console.log('Réservation reçue :', { prenom, nom, tel, service, date, heure });

  const alreadyBooked = bookings.some(b => b.date === date && b.heure === heure);
  if (alreadyBooked) {
    return res.status(409).json({ success: false, error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' });
  }

  bookings.push({ prenom, nom, tel, email, service, date, heure });

  const payload = JSON.stringify({ date, heure });
  sseClients.forEach(client => client.write(`data: ${payload}\n\n`));

  try {
    const [y, m, d] = date.split('-');
    const displayDate = parseInt(d) + ' ' + months[parseInt(m) - 1] + ' ' + y;
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'dangboemaurice@gmail.com',
      subject: `Nouvelle réservation — ${prenom} ${nom}`,
      html: `
        <h2>Nouvelle réservation</h2>
        <p><strong>Nom :</strong> ${prenom} ${nom}</p>
        <p><strong>Téléphone :</strong> ${tel}</p>
        <p><strong>Service :</strong> ${service}</p>
        <p><strong>Date :</strong> ${displayDate}</p>
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
