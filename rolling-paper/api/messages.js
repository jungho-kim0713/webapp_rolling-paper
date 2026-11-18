import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Vercel 환경변수에 등록한 DATABASE_URL로 DB 연결
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. 데이터 조회 (GET 요청)
    if (req.method === 'GET') {
      const { recipient } = req.query;

      // 이미 만들어진 친구(대상자) 이름 목록 가져오기
      const recipientsResult = await sql`
        SELECT DISTINCT recipient FROM rolling_papers ORDER BY recipient ASC
      `;
      const recipients = recipientsResult.map(r => r.recipient);

      // 선택된 친구의 롤링페이퍼 메시지들 가져오기
      let messages = [];
      if (recipient) {
        messages = await sql`
          SELECT * FROM rolling_papers 
          WHERE recipient = ${recipient} 
          ORDER BY created_at ASC
        `;
      } else if (recipients.length > 0) {
        messages = await sql`
          SELECT * FROM rolling_papers 
          WHERE recipient = ${recipients[0]} 
          ORDER BY created_at ASC
        `;
      }

      return res.status(200).json({ recipients, messages });
    }

    // 2. 새 메시지 저장 (POST 요청)
    if (req.method === 'POST') {
      const { recipient, sender, message, border_style, bg_color } = req.body;

      if (!recipient || !sender || !message) {
        return res.status(400).json({ error: '빈칸을 모두 채워주세요!' });
      }

      const inserted = await sql`
        INSERT INTO rolling_papers (recipient, sender, message, border_style, bg_color)
        VALUES (${recipient.trim()}, ${sender.trim()}, ${message.trim()}, ${border_style}, ${bg_color})
        RETURNING *
      `;

      return res.status(201).json(inserted[0]);
    }

    return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ error: error.message });
  }
}