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

app.post('/api/reservation', async (req, res) => {
  const { prenom, nom, tel, service, date, heure } = req.body;
  console.log('Réservation reçue :', { prenom, nom, tel, service, date, heure });

  try {
    console.log('Envoi email...');
    const result = await resend.emails.send({
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
    console.log('Email envoyé :', result);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('Serveur backend démarré sur http://localhost:' + PORT);
});
