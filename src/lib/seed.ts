import { db } from "@/db";
import { users, events, eventParticipants, oneTimeCodes, siteAnnouncements, ratings } from "@/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

const COVERS = {
  outdoor: "https://images.pexels.com/photos/34533758/pexels-photo-34533758.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  food: "https://images.pexels.com/photos/34507150/pexels-photo-34507150.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  game: "https://images.pexels.com/photos/33683665/pexels-photo-33683665.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  music: "https://images.pexels.com/photos/30497160/pexels-photo-30497160.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sports: "https://images.pexels.com/photos/1472887/pexels-photo-1472887.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  art: "https://images.pexels.com/photos/30907747/pexels-photo-30907747.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

let seedChecked = false;

export async function ensureSeeded() {
  if (seedChecked) return { seeded: false };
  seedChecked = true;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  if (Number(count) > 0) {
    return { seeded: false };
  }

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@joinjoy.app",
      passwordHash: hashPassword("Admin@123"),
      name: "平台管理員",
      role: "admin",
      canCreateEvent: true,
      creditScore: "100",
      bio: "揪好咖平台管理團隊",
    })
    .returning();

  const hostSeed = [
    { email: "mia@joinjoy.app", name: "Mia 山林嚮導", bio: "熱愛戶外與登山，週週開團帶大家看日出。", interests: ["戶外探索", "攝影", "早鳥限定"] },
    { email: "leo@joinjoy.app", name: "Leo 美食獵人", bio: "台北巷弄美食探店專家，吃貨們的最佳嚮導。", interests: ["美食聚餐", "深度旅遊"] },
    { email: "amy@joinjoy.app", name: "Amy 桌遊控", bio: "桌遊愛好者，新手友善，歡迎第一次來玩！", interests: ["桌遊電玩", "新手友善"] },
  ];
  const hosts = [];
  for (const h of hostSeed) {
    const [u] = await db.insert(users).values({ ...h, passwordHash: hashPassword("Host@123"), canCreateEvent: true, creditScore: "98" }).returning();
    hosts.push(u);
  }

  const memberSeed = [
    { email: "alex@joinjoy.app", name: "Alex", interests: ["運動健身", "音樂表演"] },
    { email: "grace@joinjoy.app", name: "Grace", interests: ["藝文展覽", "旅遊小旅行"] },
    { email: "tom@joinjoy.app", name: "Tom", interests: ["派對聯誼", "美食聚餐"] },
  ];
  const members = [];
  for (const m of memberSeed) {
    const [u] = await db.insert(users).values({ ...m, passwordHash: hashPassword("Member@123"), creditScore: "92" }).returning();
    members.push(u);
  }

  const eventSeed = [
    { title: "陽明山晨曦輕健走｜新手友善", cover: COVERS.outdoor, category: "outdoor", host: hosts[0], date: daysFromNow(5), start: "05:30", end: "09:00", loc: "陽明山國家公園遊客中心", region: "台北市", fee: "0", capacity: 15, desc: "一起迎接台北最美日出！全程約 4 小時緩坡步道，適合新手，備有專業嚮導與熱茶點心。", tags: ["新手友善", "早鳥限定", "免出費"], lat: "25.1717", lng: "121.5601" },
    { title: "大安區隱藏版居酒屋聚餐", cover: COVERS.food, category: "food", host: hosts[1], date: daysFromNow(2), start: "19:00", end: "21:30", loc: "大安區居食屋", region: "台北市", fee: "600", capacity: 8, desc: "巷弄裡的日式居酒屋，串燒、清酒無限暢聊，認識新朋友的最佳場合。", tags: ["單身聯誼", "小資出遊"], lat: "25.0266", lng: "121.5436" },
    { title: "週末桌遊夜｜陣營殺 & 卡坦島", cover: COVERS.game, category: "game", host: hosts[2], date: daysFromNow(3), start: "14:00", end: "18:00", loc: "信義區桌遊咖啡廳", region: "台北市", fee: "300", capacity: 12, desc: "多款人氣桌遊任你玩，主揪詳細教學，新手也能輕鬆上手！", tags: ["新手友善", "療癒放鬆"], lat: "25.0330", lng: "121.5654" },
    { title: "河濱公園夜跑 5K", cover: COVERS.sports, category: "sports", host: hosts[0], date: daysFromNow(1), start: "19:30", end: "21:00", loc: "大佳河濱公園", region: "台北市", fee: "0", capacity: 20, desc: "輕鬆配速夜跑，跑後有小聚餐敘，歡迎跑步新手加入！", tags: ["運動流汗", "免出費"], lat: "25.0700", lng: "121.5433" },
    { title: "台中爵士音樂野餐派對", cover: COVERS.music, category: "music", host: hosts[1], date: daysFromNow(10), start: "16:00", end: "20:00", loc: "台中草悟道", region: "台中市", fee: "200", capacity: 40, desc: "草地音樂野餐，帶上你的野餐墊，享受悠閒午後爵士樂。", tags: ["療癒放鬆", "文青系"], lat: "24.1477", lng: "120.6736" },
    { title: "北美館當代藝術導覽小旅行", cover: COVERS.art, category: "art", host: hosts[2], date: daysFromNow(-3), start: "14:00", end: "16:30", loc: "台北市立美術館", region: "台北市", fee: "100", capacity: 10, desc: "專業導覽帶你看懂當代藝術展，適合喜歡文青活動的朋友。", tags: ["文青系"], status: "completed", lat: "25.0731", lng: "121.5240" },
  ];

  const createdEvents = [];
  for (const e of eventSeed) {
    const [ev] = await db
      .insert(events)
      .values({
        title: e.title,
        coverImageUrl: e.cover,
        images: [e.cover],
        description: e.desc,
        region: e.region,
        eventDate: e.date,
        startTime: e.start,
        endTime: e.end,
        meetingLocation: e.loc,
        mapAddress: e.loc,
        lat: e.lat,
        lng: e.lng,
        capacity: e.capacity,
        fee: e.fee,
        contactInfo: "line: joinjoy_demo",
        notes: "請準時抵達集合地點，如需取消請提前 24 小時告知，惡意放鳥將依規範處理。",
        allowWaitlist: true,
        hostId: e.host.id,
        tags: e.tags,
        status: e.status || "upcoming",
      })
      .returning();
    createdEvents.push(ev);
    await db.insert(eventParticipants).values({ eventId: ev.id, userId: e.host.id, status: "approved" });
  }

  await db.insert(eventParticipants).values([
    { eventId: createdEvents[0].id, userId: members[0].id, status: "approved" },
    { eventId: createdEvents[0].id, userId: members[1].id, status: "approved" },
    { eventId: createdEvents[1].id, userId: members[2].id, status: "approved" },
    { eventId: createdEvents[2].id, userId: members[0].id, status: "approved" },
    { eventId: createdEvents[3].id, userId: members[1].id, status: "approved" },
    { eventId: createdEvents[5].id, userId: members[2].id, status: "approved", attended: true },
  ]);

  await db.insert(ratings).values([
    { eventId: createdEvents[5].id, raterId: hosts[2].id, rateeId: members[2].id, punctuality: 5, friendliness: 5, overall: 5, comment: "非常準時又親切！" },
  ]);

  await db.insert(oneTimeCodes).values([
    { code: "JOINJOY-DEMO01", createdBy: admin.id },
    { code: "JOINJOY-DEMO02", createdBy: admin.id },
  ]);

  await db.insert(siteAnnouncements).values({
    title: "歡迎來到揪好咖！",
    content: "把喜歡的事，變成一起的事。即日起邀請好友加入，一起揪出你的下一場精彩活動吧！",
    createdBy: admin.id,
  });

  return { seeded: true };
}
