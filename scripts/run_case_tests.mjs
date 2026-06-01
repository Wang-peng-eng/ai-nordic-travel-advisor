import fs from "node:fs";
import vm from "node:vm";
import { destinationKnowledgeBase, hotelDatabase, pricingRules, supplierDatabase, tierProfiles, tierSpecialActivities, countryPremiumExperiences, countryBusinessActivities, tierBadgeColors } from "../src/config/travelData.js";

const appSource = fs.readFileSync("src/App.jsx", "utf8");
const logicStart = appSource.indexOf("const agencyProfile");
const logicEnd = appSource.indexOf("function App()");

if (logicStart === -1 || logicEnd === -1) {
  throw new Error("Unable to locate generation logic in src/App.jsx");
}

const logicSource = appSource.slice(logicStart, logicEnd);

const cases = [
  {
    customerName: "林嘉宁",
    travelers: 4,
    departureCity: "上海",
    departureDate: "2026-10-08",
    destinations: "冰岛雷克雅未克、南岸、瓦特纳冰川",
    days: 9,
    budget: 48000,
    hotelClass: "由预算自动匹配",
    preferences: "自然风光、摄影、极光",
    specialNeeds: "需中文司导和可退改酒店方案。",
  },
  {
    customerName: "周亦辰",
    travelers: 3,
    departureCity: "北京",
    departureDate: "2026-12-01",
    destinations: "芬兰赫尔辛基、罗瓦涅米、萨利色尔卡",
    days: 7,
    budget: 22000,
    hotelClass: "由预算自动匹配",
    preferences: "亲子、轻松、极光",
    specialNeeds: "同行有儿童，减少高强度徒步。",
  },
  {
    customerName: "王思岚",
    travelers: 2,
    departureCity: "广州",
    departureDate: "2026-09-18",
    destinations: "挪威奥斯陆、卑尔根、松恩峡湾、罗弗敦",
    days: 10,
    budget: 78000,
    hotelClass: "由预算自动匹配",
    preferences: "商务考察、摄影",
    specialNeeds: "需要安排酒店踩线和供应商拜访。",
  },
  {
    customerName: "赵明煦",
    travelers: 2,
    departureCity: "杭州",
    departureDate: "2026-11-05",
    destinations: "瑞典斯德哥尔摩、乌普萨拉、基律纳、阿比斯库国家公园",
    days: 12,
    budget: 62000,
    hotelClass: "由预算自动匹配",
    preferences: "蜜月、摄影、自然风光",
    specialNeeds: "偏好私密用餐和景观酒店。",
  },
  {
    customerName: "何沐阳",
    travelers: 5,
    departureCity: "成都",
    departureDate: "2026-10-22",
    destinations: "丹麦哥本哈根、北西兰岛、欧登塞",
    days: 8,
    budget: 36000,
    hotelClass: "由预算自动匹配",
    preferences: "自然风光、亲子",
    specialNeeds: "希望控制每日车程并保留自由活动。",
  },
];

const iconStubs = `
const Sparkles = null;
const Plane = null;
const Hotel = null;
const CalendarDays = null;
const FileText = null;
const BriefcaseBusiness = null;
`;

const runner = `
function compactSections(sections) {
  const find = (id) => sections.find((section) => section.id === id);
  const overview = find("overview");
  const hotelMatch = find("hotelMatch");
  const itinerary = find("itinerary");
  const invitation = find("invitation");
  const hotel = find("hotel");
  const rowValue = (section, label) => (section.rows || []).find((row) => row[0] === label)?.[1] || "";
  const invitationText = [invitation.title, invitation.letter.heading, invitation.letter.subject, ...invitation.letter.paragraphs].join("\\n");
  const fullText = sections.map(renderTextSection).join("\\n\\n");
  return {
    country: rowValue(overview, "识别目的地"),
    customerType: rowValue(overview, "客户类型"),
    hotelTier: (hotelMatch.clauses[0].match(/-> (.+?)。/) || [])[1] || "",
    hotelRows: hotelMatch.rows,
    dayCount: itinerary.rows.length,
    firstDay: itinerary.rows[0],
    lastDay: itinerary.rows[itinerary.rows.length - 1],
    invitationTitle: invitation.title,
    hotelLetter: hotel.letter,
    invitationLetter: invitation.letter,
    invitationText,
    fullText,
  };
}

JSON.stringify(cases.map((input) => {
  const sections = buildDocuments(input);
  const summary = compactSections(sections);
  const checks = {
    dayCountMatches: summary.dayCount === Number(input.days),
    denmarkNoIcelandLeak: !/丹麦/.test(input.destinations) || !/(冰岛|雷克雅未克|黄金圈|蓝湖|瓦特纳|钻石沙滩)/.test(summary.fullText),
    finlandNoIcelandLeak: !/芬兰/.test(input.destinations) || !/(冰岛|雷克雅未克|瓦特纳|钻石沙滩)/.test(summary.fullText),
    icelandNoFinlandLeak: !/冰岛/.test(input.destinations) || !/(芬兰|赫尔辛基|罗瓦涅米|萨利色尔卡)/.test(summary.fullText),
    businessInviteOnlyWhenBusiness: /商务/.test(input.preferences) ? summary.invitationTitle === "商务邀请函" : summary.invitationTitle !== "商务邀请函",
  };
  return { input, summary, checks, sections };
}), null, 2);
`;

const context = { cases, destinationKnowledgeBase, hotelDatabase, pricingRules, supplierDatabase, tierProfiles, tierSpecialActivities, countryPremiumExperiences, countryBusinessActivities, tierBadgeColors };
const output = vm.runInNewContext(`${iconStubs}\n${logicSource}\n${runner}`, context, {
  filename: "AppGenerationLogic.vm.js",
});

process.stdout.write(output);
