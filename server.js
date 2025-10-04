/**
 * YucehanRP Web Launcher - Node.js WebSocket Backend Sunucusu
 * Bu sunucu, frontend'den gelen bağlantıları kabul eder ve verileri işler.
 * Gerekli Modül: ws (WebSocket sunucusu için)
 * Kurulum: npm install ws
 */

const WebSocket = require('ws');
// Frontend'deki WEBSOCKET_URL ile eşleşmelidir
const WSS_PORT = 3000; 

// WebSocket Sunucusunu Başlatma
const wss = new WebSocket.Server({ port: WSS_PORT }, () => {
    console.log(`[SERVER] WebSocket Sunucusu dinleniyor: ws://localhost:${WSS_PORT}`);
});

const clients = new Map();

// Yeni bir istemci bağlandığında
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[CONNECTION] Yeni bağlantı: ${clientIp}`);

    let isAuthenticated = false;
    let username = "Anonim";
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 1. Giriş İşlemi (index.js'ten gelen ilk paket)
            if (data.type === 'login' && !isAuthenticated) {
                if (data.username && data.username.length >= 3) {
                    username = data.username;
                    isAuthenticated = true;
                    clients.set(ws, { username: username, ws: ws });
                    console.log(`[AUTH] ${username} başarıyla giriş yaptı.`);
                    
                    // Frontend'e başarı mesajı gönderebilirsiniz.
                    // ws.send(JSON.stringify({ type: 'status', message: 'login_success' }));
                    
                    // TODO: Buradan sonra Bedrock sunucusuna oyuncuyu bağlama logic'i başlar.
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Geçersiz kullanıcı adı.' }));
                    ws.close(1008, 'Authentication failed');
                }
            } 
            
            // 2. Oyun Kontrol Verilerini İşleme
            else if (isAuthenticated) {
                switch (data.type) {
                    case 'movement':
                        // data.forwardBackward, data.strafe değerlerini işleyin
                        console.log(`[MOVE] ${username}: İleri/Geri=${data.forwardBackward}, Yan=${data.strafe}`);
                        break;
                    
                    case 'action':
                        // data.action (break_button_start/end vb.) değerlerini işleyin
                        console.log(`[ACTION] ${username}: ${data.action}`);
                        break;

                    case 'chat_message':
                        const chatPayload = { type: 'chat', sender: username, message: data.message };
                        console.log(`[CHAT] ${username}: ${data.message}`);
                        // Diğer bağlı istemcilere mesajı yayınlama
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(chatPayload));
                            }
                        });
                        break;
                }
            }

        } catch (e) {
            console.error(`[ERROR] Veri işlenirken hata oluştu: ${e.message}`);
        }
    });

    // İstemci bağlantısı kapandığında
    ws.on('close', (code, reason) => {
        if (isAuthenticated) {
            console.log(`[DISCONNECT] ${username} ayrıldı.`);
            clients.delete(ws);
        }
    });

    // Hata oluştuğunda
    ws.on('error', (error) => {
        console.error(`[ERROR] WebSocket hatası (${username}): ${error.message}`);
    });
});
