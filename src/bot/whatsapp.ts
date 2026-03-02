import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN } = process.env;

// 1. Validación del Webhook (Lo que ya hicimos)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// 2. Recepción de mensajes
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account' && body.entry?.[0].changes?.[0].value.messages?.[0]) {
        const msg = body.entry[0].changes[0].value.messages[0];
        const from = msg.from; // Número del cliente
        const text = msg.text.body; // Texto que envió

        console.log(`📩 Mensaje de ${from}: ${text}`);

        // AQUÍ CONECTAREMOS CON GEMINI LUEGO
        const respuestaIA = `Hola! Recibí tu mensaje: "${text}". Soy tu asistente financiero en desarrollo. 🚀`;

        // 3. Enviar respuesta a WhatsApp
        try {
            await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
                messaging_product: "whatsapp",
                to: from,
                text: { body: respuestaIA }
            }, {
                headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
            });
        } catch (error) {
            console.error("❌ Error enviando a WA", error);
        }
    }
    res.sendStatus(200);
});

app.listen(3000, '0.0.0.0', () => console.log("🚀 Bot de WhatsApp listo!"));