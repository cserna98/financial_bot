import express from 'express';

const app = express();
app.use(express.json());

const PORT = 3000;
const VERIFY_TOKEN = "tu_palabra_secreta_2026"; // Inventa una y ponla en Meta

// 1. VALIDACIÓN (Lo que Meta usa para decir "Ok, este servidor es real")
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ WEBHOOK VALIDADO POR META");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. RECEPCIÓN (Donde llegarán los mensajes de tus usuarios)
app.post('/webhook', (req, res) => {
    console.log("📩 Mensaje recibido de WhatsApp:", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🚀 WhatsApp Webhook escuchando en puerto ${PORT}`));