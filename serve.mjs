// 간단한 정적 파일 서버 + Supabase/Resend API 라우트
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tzzspafhadhvxvlgomaa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6enNwYWZoYWRodnh2bGdvbWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTE3ODcsImV4cCI6MjA5MjA2Nzc4N30.8juPFPOMBKtKMnUoPpPe4qgvUPbFTgfPskQ_sh8J6J4';
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_QGAMw8i7_92BpD1JqDAJGv6JdZpiDxr4Y';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'donghan07020@gmail.com'; // Resend 테스트 모드에서 사용할 수 있는 계정 이메일
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

async function sendResendMail(payload) {
  if (!RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY is not configured.' };
  }

  const body = {
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `새 상담 신청: ${payload.name}`,
    html: `
      <h1>새 상담 신청이 도착했습니다</h1>
      <p><strong>이름:</strong> ${payload.name}</p>
      <p><strong>이메일:</strong> ${payload.email}</p>
      <p><strong>연락처:</strong> ${payload.phone || '미입력'}</p>
      <p><strong>피부 상태:</strong> ${payload.skin_condition || '미입력'}</p>
      <p><strong>관심 사항:</strong> ${payload.concern || '미입력'}</p>
      <p><strong>추가 문의:</strong> ${payload.message || '없음'}</p>
    `,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `Resend error: ${response.status} ${errorText}` };
  }

  return { success: true };
}

async function insertConsultation(data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/consultations`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([data]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `Supabase error: ${response.status} ${errorText}` };
  }

  return { success: true };
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/consultation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.email) {
          sendJson(res, 400, { error: '이름과 이메일은 필수 입력입니다.' });
          return;
        }

        const insertResult = await insertConsultation(data);
        if (insertResult.error) {
          sendJson(res, 500, { error: insertResult.error });
          return;
        }

        const emailResult = await sendResendMail(data);
        if (emailResult.error) {
          sendJson(res, 500, { error: emailResult.error });
          return;
        }

        sendJson(res, 200, { success: true });
      } catch (error) {
        sendJson(res, 500, { error: error.message || '서버 요청 처리 중 오류가 발생했습니다.' });
      }
    });
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
