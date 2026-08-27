// ============================================================
// 🍈 DailyConversations.js
// ============================================================
// این فایل شامل دو بخش اصلی است:
// 1. DAILY_CONVERSATIONS: مکالمات روزمره (همانند نسخه‌ی قبلی)
// 2. THEMATIC_CONVERSATIONS: مکالمات موضوعی-آموزشی (اضافه‌شده از 🍆🍆)
// ============================================================

export const DAILY_CONVERSATIONS = [
  {
    "topic": "Greetings and Small Talk",
    "scenarios": [
      {
        "scenario": "First-time meeting (casual)",
        "context": "Two people meet for the first time in a casual setting.",
        "speakerA": [
          {
            "en": "Hi, I'm Alex.",
            "fa": "سلام، من الکس هستم.",
            "level": "A1"
          },
          {
            "en": "Hello, my name is Sarah.",
            "fa": "سلام، اسم من سارا است.",
            "level": "A1"
          },
          {
            "en": "Hey, I don't think we've met. I'm Jamie.",
            "fa": "هی، فکر نکنم همدیگر را دیده باشیم. من جیمی هستم.",
            "level": "A2"
          },
          {
            "en": "Nice to meet you! I'm Chris.",
            "fa": "از ملاقات شما خوشوقتم! من کریس هستم.",
            "level": "A1"
          },
          {
            "en": "How do you do? I'm Mr. Johnson.",
            "fa": "خوشوقتم؟ من آقای جانسون هستم.",
            "level": "B1"
          },
          {
            "en": "Pleased to meet you. I'm Dr. Lee.",
            "fa": "از دیدار شما خوشحالم. من دکتر لی هستم.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Hi Alex, I'm Jordan.",
            "fa": "سلام الکس، من جردن هستم.",
            "level": "A1"
          },
          {
            "en": "Hello Sarah, nice to meet you too.",
            "fa": "سلام سارا، من هم از دیدار شما خوشوقتم.",
            "level": "A1"
          },
          {
            "en": "Hey Jamie, I'm Taylor. How are you?",
            "fa": "هی جیمی، من تیلور هستم. چطورید؟",
            "level": "A2"
          },
          {
            "en": "Nice to meet you too, Chris. How's it going?",
            "fa": "من هم از ملاقات شما خوشحالم، کریس. اوضاع چطوره؟",
            "level": "B1"
          },
          {
            "en": "How do you do, Mr. Johnson? I'm pleased to meet you.",
            "fa": "خوشوقتم آقای جانسون؟ از ملاقات شما خوشحالم.",
            "level": "B1"
          },
          {
            "en": "It's an honour to meet you, Dr. Lee.",
            "fa": "مایه افتخار است که شما را ملاقات می‌کنم، دکتر لی.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Asking about well-being (general)",
        "context": "After greeting, one asks how the other is doing.",
        "speakerA": [
          {
            "en": "How are you?",
            "fa": "چطورید؟",
            "level": "A1"
          },
          {
            "en": "How are you doing?",
            "fa": "اوضاع چطوره؟",
            "level": "A2"
          },
          {
            "en": "How's everything going?",
            "fa": "همه چیز چطور پیش می‌ره؟",
            "level": "B1"
          },
          {
            "en": "How's life treating you?",
            "fa": "زندگی با شما چطور برخورد می‌کنه؟",
            "level": "B2"
          },
          {
            "en": "How have you been lately?",
            "fa": "این روزها چطور بوده‌اید؟",
            "level": "B2"
          },
          {
            "en": "What's up with you these days?",
            "fa": "این روزها چه خبر از شما؟",
            "level": "C1"
          },
          {
            "en": "How was your weekend?",
            "fa": "آخر هفته‌ات چطور بود؟",
            "level": "A2"
          },
          {
            "en": "How was your day?",
            "fa": "روزت چطور بود؟",
            "level": "A2"
          },
          {
            "en": "How are things at work?",
            "fa": "اوضاع سر کار چطوره؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Fine, thanks. And you?",
            "fa": "خوبم، متشکرم. شما چطورید؟",
            "level": "A1"
          },
          {
            "en": "Pretty good, thanks for asking.",
            "fa": "نسبتاً خوبم، ممنون که پرسیدید.",
            "level": "A2"
          },
          {
            "en": "Not bad, just busy as usual.",
            "fa": "بد نیست، مثل همیشه مشغول.",
            "level": "B1"
          },
          {
            "en": "I'm doing well, actually. I just got a promotion.",
            "fa": "در واقع خوبم. تازه ترفیع گرفتم.",
            "level": "B2"
          },
          {
            "en": "Could be better, but I can't complain.",
            "fa": "می‌توانست بهتر باشد، اما نمی‌تونم شکایت کنم.",
            "level": "C1"
          },
          {
            "en": "It's been a bit stressful, but I'm managing.",
            "fa": "کمی استرس‌زا بوده، اما دارم مدیریتش می‌کنم.",
            "level": "C1"
          },
          {
            "en": "My weekend was great! I went hiking.",
            "fa": "آخر هفته‌ام عالی بود! رفتم کوهنوردی.",
            "level": "A2"
          },
          {
            "en": "My day was quite productive, thanks.",
            "fa": "روزم نسبتاً پربار بود، ممنون.",
            "level": "B1"
          },
          {
            "en": "Work is hectic, but I enjoy it.",
            "fa": "کار شلوغه، اما ازش لذت می‌برم.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Introducing People",
    "scenarios": [
      {
        "scenario": "Introducing oneself",
        "context": "One person introduces themselves to another.",
        "speakerA": [
          {
            "en": "Hi, I'm Anna.",
            "fa": "سلام، من آنا هستم.",
            "level": "A1"
          },
          {
            "en": "Hello, my name is David. What's yours?",
            "fa": "سلام، اسم من دیوید است. اسم شما چیست؟",
            "level": "A1"
          },
          {
            "en": "Let me introduce myself – I'm Dr. Brown.",
            "fa": "بگذارید خودم را معرفی کنم – من دکتر براون هستم.",
            "level": "B1"
          },
          {
            "en": "I don't think we've met. I'm Emily.",
            "fa": "فکر نکنم همدیگر را دیده باشیم. من امیلی هستم.",
            "level": "A2"
          },
          {
            "en": "Allow me to introduce myself: I'm Professor Smith.",
            "fa": "اجازه دهید خودم را معرفی کنم: من پروفسور اسمیت هستم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Hi Anna, I'm John.",
            "fa": "سلام آنا، من جان هستم.",
            "level": "A1"
          },
          {
            "en": "Nice to meet you, David.",
            "fa": "از ملاقات شما خوشوقتم، دیوید.",
            "level": "A1"
          },
          {
            "en": "Pleased to meet you, Dr. Brown.",
            "fa": "از دیدار شما خوشحالم، دکتر براون.",
            "level": "B1"
          },
          {
            "en": "Oh, hi Emily! I'm Mike.",
            "fa": "اوه، سلام امیلی! من مایک هستم.",
            "level": "A2"
          },
          {
            "en": "It's an honour, Professor Smith.",
            "fa": "مایه افتخار است، پروفسور اسمیت.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Introducing two people to each other",
        "context": "A third person introduces two strangers.",
        "speakerA": [
          {
            "en": "Let me introduce you to my colleague, Lisa.",
            "fa": "بگذارید شما را به همکارم، لیزا معرفی کنم.",
            "level": "B1"
          },
          {
            "en": "This is my friend, Tom. Tom, this is Sarah.",
            "fa": "این دوست من، تام است. تام، این سارا است.",
            "level": "A2"
          },
          {
            "en": "I'd like you to meet my brother, James.",
            "fa": "مایلم برادرم، جیمز را ملاقات کنید.",
            "level": "B1"
          },
          {
            "en": "Have you two met? This is Maria.",
            "fa": "آیا شما دو تا همدیگر را ملاقات کرده‌اید؟ این ماریا است.",
            "level": "B2"
          },
          {
            "en": "Allow me to present our new manager, Mr. Adams.",
            "fa": "اجازه دهید مدیر جدیدمان، آقای آدامز را معرفی کنم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Hi Lisa, nice to meet you.",
            "fa": "سلام لیزا، از ملاقات شما خوشوقتم.",
            "level": "A1"
          },
          {
            "en": "Hey Tom, how's it going?",
            "fa": "هی تام، اوضاع چطوره؟",
            "level": "A2"
          },
          {
            "en": "Nice to meet you, James. I've heard a lot about you.",
            "fa": "از ملاقات شما خوشوقتم، جیمز. چیزهای زیادی درباره شما شنیده‌ام.",
            "level": "B1"
          },
          {
            "en": "No, we haven't met. Hello Maria.",
            "fa": "نه، همدیگر را ندیده‌ایم. سلام ماریا.",
            "level": "A2"
          },
          {
            "en": "How do you do, Mr. Adams? I'm pleased to meet you.",
            "fa": "خوشوقتم، آقای آدامز؟ از دیدار شما خوشحالم.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Visiting an Old Friend",
    "scenarios": [
      {
        "scenario": "Meeting unexpectedly",
        "context": "Two friends run into each other after a long time.",
        "speakerA": [
          {
            "en": "Wow, I haven't seen you for ages!",
            "fa": "واو، سال‌هاست تو را ندیده‌ام!",
            "level": "A2"
          },
          {
            "en": "How nice to see you again!",
            "fa": "چه خوب شد دوباره تو را دیدم!",
            "level": "A2"
          },
          {
            "en": "What a surprise! How have you been?",
            "fa": "چه تعجب! چطور بوده‌ای؟",
            "level": "B1"
          },
          {
            "en": "I thought you were in Canada. What are you doing here?",
            "fa": "فکر کردم کانادا هستی. اینجا چیکار می‌کنی؟",
            "level": "B1"
          },
          {
            "en": "You look great! Have you been working out?",
            "fa": "عالی به نظر می‌رسی! ورزش می‌کردی؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "I know, it's been too long!",
            "fa": "می‌دانم، خیلی وقته!",
            "level": "A2"
          },
          {
            "en": "Nice to see you too! What's new with you?",
            "fa": "من هم خوشحالم که تو را می‌بینم! چه خبر از تو؟",
            "level": "A2"
          },
          {
            "en": "I've been busy with work and family. How about you?",
            "fa": "سر کار و خانواده مشغول بودم. تو چطور؟",
            "level": "B1"
          },
          {
            "en": "I came back last week. I'm here for a conference.",
            "fa": "هفته پیش برگشتم. برای یک کنفرانس اینجام.",
            "level": "B1"
          },
          {
            "en": "Thanks! I've been trying to stay fit.",
            "fa": "ممنون! سعی کردم تناسب اندامم را حفظ کنم.",
            "level": "B2"
          }
        ]
      },
      {
        "scenario": "Planned visit to a friend's place",
        "context": "One friend visits the other at their home.",
        "speakerA": [
          {
            "en": "Hi, I came to see you as promised.",
            "fa": "سلام، طبق قولم به دیدنت آمدم.",
            "level": "A2"
          },
          {
            "en": "Thanks for having me over.",
            "fa": "ممنون که من را دعوت کردی.",
            "level": "B1"
          },
          {
            "en": "Your house looks lovely! I love the new decor.",
            "fa": "خانه‌ات قشنگه! دکوراسیون جدید را دوست دارم.",
            "level": "B1"
          },
          {
            "en": "How have you been keeping? I've missed our chats.",
            "fa": "چطور بودی؟ دلم برای گپ‌هایمان تنگ شده.",
            "level": "B2"
          },
          {
            "en": "I brought some cake for us.",
            "fa": "یک کیک برایمان آوردم.",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "Welcome! Come in, make yourself at home.",
            "fa": "خوش آمدی! بیا داخل، خودت را در خانه ات فرض کن.",
            "level": "A2"
          },
          {
            "en": "It's so good to see you again!",
            "fa": "خیلی خوبه که دوباره می‌بینمت!",
            "level": "A2"
          },
          {
            "en": "I'm glad you like it. I just redecorated.",
            "fa": "خوشحالم که دوست داری. تازه دکوراسیون را عوض کردم.",
            "level": "B1"
          },
          {
            "en": "I've been well, just busy. I missed you too!",
            "fa": "خوب بودم، فقط مشغول. دلم هم برای تو تنگ شده!",
            "level": "B2"
          },
          {
            "en": "Oh, you didn't have to bring anything. Thanks!",
            "fa": "اوه، نباید چیزی می‌آوردی. ممنون!",
            "level": "A2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Getting Acquainted (Personal Questions)",
    "scenarios": [
      {
        "scenario": "Asking about origin and background",
        "context": "People ask each other about nationality, city, etc.",
        "speakerA": [
          {
            "en": "Where are you from?",
            "fa": "اهل کجا هستید؟",
            "level": "A1"
          },
          {
            "en": "What country are you from?",
            "fa": "اهل کدام کشور هستید؟",
            "level": "A1"
          },
          {
            "en": "Which city are you from?",
            "fa": "از کدام شهر هستید؟",
            "level": "A2"
          },
          {
            "en": "Are you originally from here?",
            "fa": "اصلأ اهل اینجا هستید؟",
            "level": "B1"
          },
          {
            "en": "What is your nationality?",
            "fa": "ملیت شما چیست؟",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "I'm from Iran.",
            "fa": "اهل ایران هستم.",
            "level": "A1"
          },
          {
            "en": "I come from Germany.",
            "fa": "از آلمان آمده‌ام.",
            "level": "A1"
          },
          {
            "en": "I'm from Tehran, the capital.",
            "fa": "اهل تهران، پایتخت هستم.",
            "level": "A2"
          },
          {
            "en": "No, I moved here five years ago.",
            "fa": "نه، پنج سال پیش به اینجا نقل مکان کردم.",
            "level": "B1"
          },
          {
            "en": "My nationality is Italian.",
            "fa": "ملیت من ایتالیایی است.",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Asking about job and study",
        "context": "People ask about occupation or education.",
        "speakerA": [
          {
            "en": "What do you do for a living?",
            "fa": "چه شغلی دارید؟",
            "level": "A2"
          },
          {
            "en": "Are you a student or working?",
            "fa": "دانشجو هستید یا شاغل؟",
            "level": "A2"
          },
          {
            "en": "What do you study?",
            "fa": "چه رشته‌ای تحصیل می‌کنید؟",
            "level": "A2"
          },
          {
            "en": "What's your profession?",
            "fa": "حرفه شما چیست؟",
            "level": "B1"
          },
          {
            "en": "Where do you work?",
            "fa": "کجا کار می‌کنید؟",
            "level": "A1"
          }
        ],
        "speakerB": [
          {
            "en": "I'm a teacher.",
            "fa": "معلم هستم.",
            "level": "A1"
          },
          {
            "en": "I'm a student at the university.",
            "fa": "دانشجوی دانشگاه هستم.",
            "level": "A1"
          },
          {
            "en": "I study business administration.",
            "fa": "مدیریت بازرگانی می‌خوانم.",
            "level": "A2"
          },
          {
            "en": "I'm a software engineer.",
            "fa": "مهندس نرم‌افزار هستم.",
            "level": "B1"
          },
          {
            "en": "I work in a bank downtown.",
            "fa": "در یک بانک در مرکز شهر کار می‌کنم.",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Family and hobbies",
        "context": "Asking about family, interests, free time.",
        "speakerA": [
          {
            "en": "Are you married or single?",
            "fa": "متاهل هستید یا مجرد؟",
            "level": "A1"
          },
          {
            "en": "Do you have any children?",
            "fa": "بچه دارید؟",
            "level": "A2"
          },
          {
            "en": "What are your hobbies?",
            "fa": "سرگرمی‌های شما چیست؟",
            "level": "A2"
          },
          {
            "en": "How do you spend your free time?",
            "fa": "وقت آزادتان را چطور می‌گذرانید؟",
            "level": "B1"
          },
          {
            "en": "Do you like to read or watch movies?",
            "fa": "کتاب خواندن یا فیلم دیدن را دوست دارید؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "I'm married with two kids.",
            "fa": "متاهل هستم و دو تا بچه دارم.",
            "level": "A2"
          },
          {
            "en": "I'm single, actually.",
            "fa": "در واقع مجرد هستم.",
            "level": "A1"
          },
          {
            "en": "I enjoy hiking and photography.",
            "fa": "کوهنوردی و عکاسی را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "In my free time, I like to cook and travel.",
            "fa": "در وقت آزادم آشپزی و سفر را دوست دارم.",
            "level": "B1"
          },
          {
            "en": "I love both! I read novels and watch documentaries.",
            "fa": "هر دو را دوست دارم! رمان می‌خوانم و مستند می‌بینم.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Invitations",
    "scenarios": [
      {
        "scenario": "Extending an invitation (formal/informal)",
        "context": "One person invites another to an event or meal.",
        "speakerA": [
          {
            "en": "Would you like to join me for lunch today?",
            "fa": "مایلید امروز با من ناهار بخورید؟",
            "level": "A2"
          },
          {
            "en": "Can you come to my place for dinner on Saturday?",
            "fa": "آیا می‌توانید شنبه برای شام به منزل من بیایید؟",
            "level": "A2"
          },
          {
            "en": "We'd love to have you over for a barbecue this weekend.",
            "fa": "ما خیلی دوست داریم شما را برای کباب آخر هفته مهمان کنیم.",
            "level": "B1"
          },
          {
            "en": "I'd like to invite you to a concert next Friday if you're free.",
            "fa": "اگر آزاد هستید، دوست دارم شما را به یک کنسرت جمعه آینده دعوت کنم.",
            "level": "B2"
          },
          {
            "en": "Would you be interested in joining us for a hike on Sunday?",
            "fa": "آیا به پیاده‌روی یکشنبه با ما علاقه‌مندید؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "I'd love to! What time?",
            "fa": "با کمال میل! چه ساعتی؟",
            "level": "A2"
          },
          {
            "en": "That sounds great. I'll be there.",
            "fa": "عالی به نظر می‌رسد. می‌آیم.",
            "level": "A2"
          },
          {
            "en": "Thank you for the invitation. I'd be delighted to come.",
            "fa": "از دعوتتان متشکرم. خوشحال می‌شوم بیایم.",
            "level": "B1"
          },
          {
            "en": "I'd love to, but I'm afraid I have other plans.",
            "fa": "خیلی دوست دارم، اما متأسفم برنامه دیگری دارم.",
            "level": "B1"
          },
          {
            "en": "I'm not sure yet. Can I let you know later?",
            "fa": "هنوز مطمئن نیستم. می‌توانم بعداً به شما خبر بدهم؟",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Accepting or Refusing an Invitation",
    "scenarios": [
      {
        "scenario": "Polite acceptance",
        "context": "Accepting an invitation gracefully.",
        "speakerA": [
          {
            "en": "I'd love to come, thank you.",
            "fa": "خیلی دوست دارم بیایم، ممنون.",
            "level": "A2"
          },
          {
            "en": "That would be wonderful. I'll be happy to join.",
            "fa": "عالی خواهد بود. خوشحال می‌شوم ملحق شوم.",
            "level": "B1"
          },
          {
            "en": "Yes, I'd be delighted to accept.",
            "fa": "بله، با کمال میل می‌پذیرم.",
            "level": "B2"
          },
          {
            "en": "Sounds perfect! I wouldn't miss it.",
            "fa": "عالی به نظر می‌رسد! از دستش نمی‌دهم.",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "I'm glad you can make it.",
            "fa": "خوشحالم که می‌توانید بیایید.",
            "level": "A2"
          },
          {
            "en": "Great! I'll count you in.",
            "fa": "عالی! حساب شما را می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Perfect, I'll see you then.",
            "fa": "عالی، پس می‌بینمتان.",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Polite refusal",
        "context": "Declining an invitation politely.",
        "speakerA": [
          {
            "en": "I'm sorry, but I won't be able to come.",
            "fa": "متأسفم، اما نمی‌توانم بیایم.",
            "level": "A2"
          },
          {
            "en": "I'd love to, but I already have plans.",
            "fa": "خیلی دوست دارم، اما از قبل برنامه دارم.",
            "level": "B1"
          },
          {
            "en": "Thank you so much for asking, but I can't make it.",
            "fa": "خیلی ممنون که دعوت کردید، اما نمی‌توانم.",
            "level": "B1"
          },
          {
            "en": "I wish I could, but I'm afraid I'm busy that day.",
            "fa": "کاش می‌توانستم، اما متأسفم آن روز مشغولم.",
            "level": "B2"
          },
          {
            "en": "Maybe next time! Thanks anyway.",
            "fa": "شاید دفعه بعد! به هر حال ممنون.",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "No problem, maybe another time.",
            "fa": "اشکال ندارد، شاید دفعه دیگر.",
            "level": "A2"
          },
          {
            "en": "That's a pity, but I understand.",
            "fa": "حیف شد، اما متوجه می‌شوم.",
            "level": "B1"
          },
          {
            "en": "Don't worry, we'll catch up later.",
            "fa": "نگران نباش، بعداً می‌بینمت.",
            "level": "B1"
          },
          {
            "en": "I completely understand. Let's plan for another day.",
            "fa": "کاملاً درک می‌کنم. بیایید برای روز دیگری برنامه بریزیم.",
            "level": "B2"
          },
          {
            "en": "You're always welcome, whenever works for you.",
            "fa": "همیشه خوش‌آمدید، هر وقت که برایتان مناسب بود.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Saying Goodbye",
    "scenarios": [
      {
        "scenario": "Informal farewell",
        "context": "Two people part ways casually.",
        "speakerA": [
          {
            "en": "Bye! See you later.",
            "fa": "خدا حافظ! بعداً می‌بینمت.",
            "level": "A1"
          },
          {
            "en": "Catch you later!",
            "fa": "بعداً می‌بینمت!",
            "level": "A2"
          },
          {
            "en": "It was great seeing you. Take care!",
            "fa": "دیدار شما عالی بود. مراقب خودت باش!",
            "level": "B1"
          },
          {
            "en": "I've got to run. Talk soon!",
            "fa": "باید بروم. به زودی صحبت می‌کنیم!",
            "level": "B1"
          },
          {
            "en": "See you around!",
            "fa": "می‌بینمت!",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "Bye! Take it easy.",
            "fa": "خدا حافظ! سخت نگیر.",
            "level": "A2"
          },
          {
            "en": "See you later, alligator!",
            "fa": "بعداً می‌بینمت!",
            "level": "A2"
          },
          {
            "en": "You too! Have a good one.",
            "fa": "شما هم! روز خوبی داشته باش.",
            "level": "B1"
          },
          {
            "en": "Goodbye, and thanks for everything.",
            "fa": "خدا حافظ و ممنون برای همه چیز.",
            "level": "B1"
          },
          {
            "en": "See you around!",
            "fa": "می‌بینمت!",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Formal farewell",
        "context": "Leaving a formal event or meeting.",
        "speakerA": [
          {
            "en": "Goodbye, it was a pleasure meeting you.",
            "fa": "خداحافظ، از ملاقات شما خوشحال شدم.",
            "level": "B1"
          },
          {
            "en": "Thank you for your time. I must be going now.",
            "fa": "از وقتی که گذاشتید متشکرم. حالا باید بروم.",
            "level": "B2"
          },
          {
            "en": "I hope to see you again soon.",
            "fa": "امیدوارم به زودی دوباره شما را ببینم.",
            "level": "B1"
          },
          {
            "en": "Please give my regards to your family.",
            "fa": "لطفاً سلام مرا به خانواده‌تان برسانید.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "It was nice meeting you too. Goodbye.",
            "fa": "من هم از ملاقات شما خوشحال شدم. خداحافظ.",
            "level": "B1"
          },
          {
            "en": "Thank you for coming. Have a safe journey.",
            "fa": "ممنون که تشریف آوردید. سفر بخیر.",
            "level": "B2"
          },
          {
            "en": "I hope we can meet again. Take care.",
            "fa": "امیدوارم دوباره ملاقات کنیم. مراقب باشید.",
            "level": "B1"
          },
          {
            "en": "I will. Goodbye, and all the best.",
            "fa": "حتماً. خداحافظ و بهترین‌ها را برایتان آرزو می‌کنم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Telephone Conversation",
    "scenarios": [
      {
        "scenario": "Making a call",
        "context": "Calling someone and asking to speak to them.",
        "speakerA": [
          {
            "en": "Hello, this is Alex. Is John there?",
            "fa": "سلام، من الکس هستم. جان آنجاست؟",
            "level": "A1"
          },
          {
            "en": "May I speak to Sarah, please?",
            "fa": "لطفاً می‌توانم با سارا صحبت کنم؟",
            "level": "A2"
          },
          {
            "en": "Could I talk to the manager?",
            "fa": "می‌توانم با مدیر صحبت کنم؟",
            "level": "B1"
          },
          {
            "en": "I'd like to leave a message for Mr. Smith.",
            "fa": "می‌خواهم برای آقای اسمیت پیغام بگذارم.",
            "level": "B1"
          },
          {
            "en": "Is this 555-1234?",
            "fa": "آیا این شماره ۵۵۵-۱۲۳۴ است؟",
            "level": "A1"
          }
        ],
        "speakerB": [
          {
            "en": "Speaking. Who's calling?",
            "fa": "خودم هستم. شما که هستید؟",
            "level": "A2"
          },
          {
            "en": "Please hold on. I'll see if she's in.",
            "fa": "لطفاً گوشی را نگه دارید. می‌بینم آیا هست یا نه.",
            "level": "A2"
          },
          {
            "en": "I'm afraid he's not available right now. Can I take a message?",
            "fa": "متأسفم او در دسترس نیست. پیغامی بگذارم؟",
            "level": "B1"
          },
          {
            "en": "Yes, this is 555-1234. Who are you calling?",
            "fa": "بله، این شماره ۵۵۵-۱۲۳۴ است. با چه کسی تماس دارید؟",
            "level": "A1"
          },
          {
            "en": "I'll put you through to his office.",
            "fa": "شما را به دفترش وصل می‌کنم.",
            "level": "B1"
          }
        ]
      },
      {
        "scenario": "Taking a message or handling wrong numbers",
        "context": "The caller asks to leave a message or has dialled incorrectly.",
        "speakerA": [
          {
            "en": "Can I leave a message for her?",
            "fa": "می‌توانم برای او پیغام بگذارم؟",
            "level": "A2"
          },
          {
            "en": "Please tell him I called.",
            "fa": "لطفاً به او بگویید من زنگ زدم.",
            "level": "A2"
          },
          {
            "en": "Could you ask her to call me back at this number?",
            "fa": "می‌توانید از او بخواهید با این شماره به من زنگ بزند؟",
            "level": "B1"
          },
          {
            "en": "I'm sorry, I must have dialled the wrong number.",
            "fa": "متأسفم، باید شماره اشتباهی گرفته باشم.",
            "level": "B1"
          },
          {
            "en": "I'll call back later. Thanks.",
            "fa": "بعداً دوباره زنگ می‌زنم. ممنون.",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "Sure, what's the message?",
            "fa": "حتماً، پیغام چیست؟",
            "level": "A2"
          },
          {
            "en": "I'll give him the message when he returns.",
            "fa": "وقتی برگشت پیغام را به او می‌رسانم.",
            "level": "B1"
          },
          {
            "en": "Could you spell your name, please?",
            "fa": "لطفاً اسمتان را هجی کنید؟",
            "level": "A2"
          },
          {
            "en": "I'm afraid you have the wrong extension.",
            "fa": "متأسفم شماره داخلی اشتباه گرفته‌اید.",
            "level": "B1"
          },
          {
            "en": "No problem. I'll try again later.",
            "fa": "اشکال ندارد. بعداً دوباره امتحان می‌کنم.",
            "level": "A2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Transportation",
    "scenarios": [
      {
        "scenario": "Renting a car",
        "context": "At a car rental agency.",
        "speakerA": [
          {
            "en": "I'd like to rent a car for the weekend.",
            "fa": "می‌خواهم برای آخر هفته یک ماشین کرایه کنم.",
            "level": "A2"
          },
          {
            "en": "How much is the daily rate for a small car?",
            "fa": "نرخ روزانه برای یک ماشین کوچک چقدر است؟",
            "level": "A2"
          },
          {
            "en": "Do you have automatic transmission?",
            "fa": "دنده اتوماتیک دارید؟",
            "level": "B1"
          },
          {
            "en": "What insurance is included?",
            "fa": "چه بیمه‌ای شامل می‌شود؟",
            "level": "B2"
          },
          {
            "en": "Can I return the car at a different branch?",
            "fa": "می‌توانم ماشین را در شعبه دیگر تحویل بدهم؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, we have a compact car for $35 a day.",
            "fa": "بله، یک ماشین کوچک با ۳۵ دلار در روز داریم.",
            "level": "A2"
          },
          {
            "en": "You need a valid driver's license and a credit card.",
            "fa": "به گواهینامه معتبر و کارت اعتباری نیاز دارید.",
            "level": "B1"
          },
          {
            "en": "We require a refundable deposit.",
            "fa": "ما سپرده قابل استرداد نیاز داریم.",
            "level": "B2"
          },
          {
            "en": "Yes, you can return it at any of our city branches.",
            "fa": "بله، می‌توانید در هر شعبه شهری ما تحویل دهید.",
            "level": "B1"
          },
          {
            "en": "Please fill out this form and sign here.",
            "fa": "لطفاً این فرم را پر کنید و اینجا امضا کنید.",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Using the city bus",
        "context": "Asking for directions and bus information.",
        "speakerA": [
          {
            "en": "Where is the nearest bus stop?",
            "fa": "نزدیک‌ترین ایستگاه اتوبوس کجاست؟",
            "level": "A1"
          },
          {
            "en": "Which bus goes to downtown?",
            "fa": "کدام اتوبوس به مرکز شهر می‌رود؟",
            "level": "A2"
          },
          {
            "en": "How often do the buses run?",
            "fa": "اتوبوس‌ها هر چند وقت یک بار می‌آیند؟",
            "level": "A2"
          },
          {
            "en": "Does this bus stop at Central Station?",
            "fa": "آیا این اتوبوس در ایستگاه مرکزی توقف می‌کند؟",
            "level": "B1"
          },
          {
            "en": "Can you tell me when to get off?",
            "fa": "می‌توانید به من بگویید کجا پیاده شوم؟",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "It's just around the corner.",
            "fa": "همین گوشه است.",
            "level": "A1"
          },
          {
            "en": "Take bus number 42.",
            "fa": "سوار اتوبوس شماره ۴۲ شوید.",
            "level": "A2"
          },
          {
            "en": "They come every 15 minutes.",
            "fa": "هر ۱۵ دقیقه یک بار می‌آیند.",
            "level": "A2"
          },
          {
            "en": "Yes, this bus goes to Central Station.",
            "fa": "بله، این اتوبوس به ایستگاه مرکزی می‌رود.",
            "level": "B1"
          },
          {
            "en": "I'll call out your stop. It's three stops from here.",
            "fa": "ایستگاه شما را اعلام می‌کنم. سه ایستگاه دیگر است.",
            "level": "B1"
          }
        ]
      },
      {
        "scenario": "Buying a train/plane ticket",
        "context": "At a station or booking office.",
        "speakerA": [
          {
            "en": "When does the next train to London leave?",
            "fa": "قطار بعدی به لندن چه ساعتی حرکت می‌کند؟",
            "level": "A2"
          },
          {
            "en": "I need a one-way ticket to Paris.",
            "fa": "یک بلیط یک‌طرفه به پاریس نیاز دارم.",
            "level": "A2"
          },
          {
            "en": "How much is a first-class ticket?",
            "fa": "بلیط درجه یک چقدر است؟",
            "level": "B1"
          },
          {
            "en": "Is there a direct flight to Tokyo?",
            "fa": "پرواز مستقیم به توکیو وجود دارد؟",
            "level": "B1"
          },
          {
            "en": "I'd like to book a flight for next Monday.",
            "fa": "می‌خواهم یک پرواز برای دوشنبه آینده رزرو کنم.",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "The next train departs at 10:15.",
            "fa": "قطار بعدی ساعت ۱۰:۱۵ حرکت می‌کند.",
            "level": "A2"
          },
          {
            "en": "A one-way ticket is $45.",
            "fa": "بلیط یک‌طرفه ۴۵ دلار است.",
            "level": "A2"
          },
          {
            "en": "First class is $150, economy is $90.",
            "fa": "درجه یک ۱۵۰ دلار، اقتصادی ۹۰ دلار است.",
            "level": "B1"
          },
          {
            "en": "We have a connecting flight via Dubai.",
            "fa": "یک پرواز متصل از طریق دبی داریم.",
            "level": "B2"
          },
          {
            "en": "Let me check availability for Monday.",
            "fa": "بگذارید موجودی دوشنبه را بررسی کنم.",
            "level": "B1"
          }
        ]
      },
      {
        "scenario": "Taking a taxi",
        "context": "Hailing a cab and giving directions.",
        "speakerA": [
          {
            "en": "Can you take me to the airport, please?",
            "fa": "لطفاً مرا به فرودگاه می‌برید؟",
            "level": "A1"
          },
          {
            "en": "How much will it cost to go to downtown?",
            "fa": "به مرکز شهر چقدر می‌شود؟",
            "level": "A2"
          },
          {
            "en": "Please stop here. I'll get out.",
            "fa": "لطفاً اینجا توقف کنید. پیاده می‌شوم.",
            "level": "A2"
          },
          {
            "en": "Could you drive a bit slower?",
            "fa": "می‌توانید کمی آهسته‌تر برانید؟",
            "level": "B1"
          },
          {
            "en": "I'm in a hurry, please take the fastest route.",
            "fa": "عجله دارم، لطفاً سریع‌ترین راه را بگیرید.",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Sure, get in.",
            "fa": "حتماً، سوار شوید.",
            "level": "A1"
          },
          {
            "en": "That'll be about $20.",
            "fa": "حدود ۲۰ دلار می‌شود.",
            "level": "A2"
          },
          {
            "en": "Here we are. That's $12.50.",
            "fa": "رسیدیم. ۱۲ دلار و ۵۰ سنت می‌شود.",
            "level": "A2"
          },
          {
            "en": "I'll take the highway to save time.",
            "fa": "برای صرفه‌جویی در وقت از بزرگراه می‌روم.",
            "level": "B1"
          },
          {
            "en": "Can you help me with my luggage?",
            "fa": "می‌توانید در حمل چمدان‌ها کمکم کنید؟",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Gas Station and Auto Repair",
    "scenarios": [
      {
        "scenario": "At a gas station",
        "context": "Refuelling the car and asking for services.",
        "speakerA": [
          {
            "en": "Fill it up with unleaded, please.",
            "fa": "لطفاً باک را با بنزین بدون سرب پر کنید.",
            "level": "A2"
          },
          {
            "en": "Can you check the tire pressure?",
            "fa": "می‌توانید باد لاستیک‌ها را چک کنید؟",
            "level": "B1"
          },
          {
            "en": "I need some oil, please.",
            "fa": "کمی روغن نیاز دارم.",
            "level": "A2"
          },
          {
            "en": "How much does it cost per gallon?",
            "fa": "هر گالن چند است؟",
            "level": "A2"
          },
          {
            "en": "Please clean the windshield.",
            "fa": "لطفاً شیشه جلو را تمیز کنید.",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "That's $30, please.",
            "fa": "۳۰ دلار می‌شود، لطفاً.",
            "level": "A2"
          },
          {
            "en": "Your tires are fine, but you need a bit of air.",
            "fa": "لاستیک‌ها خوب هستند، اما کمی باد نیاز دارند.",
            "level": "B1"
          },
          {
            "en": "Here's your oil. Do you want me to pour it?",
            "fa": "روغن شما این است. می‌خواهید بریزم؟",
            "level": "B1"
          },
          {
            "en": "The price is $3.50 per gallon.",
            "fa": "قیمت هر گالن ۳ دلار و ۵۰ سنت است.",
            "level": "A2"
          },
          {
            "en": "I'll clean it for you.",
            "fa": "آن را برایتان تمیز می‌کنم.",
            "level": "A2"
          }
        ]
      },
      {
        "scenario": "Auto repair shop",
        "context": "Describing car problems and asking for repairs.",
        "speakerA": [
          {
            "en": "My car won't start. Can you help?",
            "fa": "ماشینم روشن نمی‌شود. می‌توانید کمک کنید؟",
            "level": "A2"
          },
          {
            "en": "There's a strange noise from the engine.",
            "fa": "صدای عجیبی از موتور می‌آید.",
            "level": "B1"
          },
          {
            "en": "I think I have a flat tire.",
            "fa": "فکر کنم لاستیکم پنچر شده است.",
            "level": "A2"
          },
          {
            "en": "How long will it take to fix the brakes?",
            "fa": "تعمیر ترمزها چقدر طول می‌کشد؟",
            "level": "B1"
          },
          {
            "en": "Please check the battery and alternator.",
            "fa": "لطفاً باطری و دینام را چک کنید.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Let me have a look under the hood.",
            "fa": "بگذارید زیر کاپوت را نگاه کنم.",
            "level": "B1"
          },
          {
            "en": "It might be the spark plugs. I'll replace them.",
            "fa": "ممکن است شمع‌ها باشد. عوضشان می‌کنم.",
            "level": "B2"
          },
          {
            "en": "You have a puncture. I can fix it in about 20 minutes.",
            "fa": "پنچری دارید. می‌توانم حدود ۲۰ دقیقه‌ای درستش کنم.",
            "level": "A2"
          },
          {
            "en": "The brake pads are worn. It'll cost $150.",
            "fa": "لنت ترمز سائیده شده. ۱۵۰ دلار می‌شود.",
            "level": "B1"
          },
          {
            "en": "Your battery is dead. You need a new one.",
            "fa": "باطری شما تمام شده. به باطری جدید نیاز دارید.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Weather and Seasons",
    "scenarios": [
      {
        "scenario": "Commenting on the weather (casual)",
        "context": "Two people meet and talk about today's weather.",
        "speakerA": [
          {
            "en": "Nice weather today, isn't it?",
            "fa": "امروز هوا عالیه، نه؟",
            "level": "A1"
          },
          {
            "en": "It's really hot outside. I'm sweating!",
            "fa": "بیرون واقعاً گرمه. دارم عرق می‌کنم!",
            "level": "A2"
          },
          {
            "en": "Looks like it's going to rain. I should have brought an umbrella.",
            "fa": "انگار می‌خواد بارون بیاد. کاش چتر آورده بودم.",
            "level": "B1"
          },
          {
            "en": "What's the forecast for this weekend?",
            "fa": "پیش‌بینی هوا برای آخر هفته چیه؟",
            "level": "A2"
          },
          {
            "en": "I can't stand this humidity. It's so sticky!",
            "fa": "این رطوبت رو تحمل نمی‌کنم. چقدر چسبنده است!",
            "level": "B2"
          },
          {
            "en": "The wind is picking up. Maybe a storm is brewing.",
            "fa": "باد داره تندتر می‌شه. شاید یه طوفان در راه باشه.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's beautiful! Perfect for a walk.",
            "fa": "آره، عالیه! برای قدم زدن عالیه.",
            "level": "A1"
          },
          {
            "en": "Tell me about it. I wish I had some iced tea.",
            "fa": "بگو نداره! کاش چای سرد داشتم.",
            "level": "A2"
          },
          {
            "en": "Yeah, I feel a few drops already. Let's go inside.",
            "fa": "آره، همون الان چند قطره حس می‌کنم. بریم داخل.",
            "level": "B1"
          },
          {
            "en": "They said it's going to be cloudy but dry.",
            "fa": "گفتن ابریه ولی بارون نمیاد.",
            "level": "A2"
          },
          {
            "en": "I know, it's unbearable. I'm heading to the coast next week.",
            "fa": "می‌دونم، غیرقابل تحمله. هفته بعد دارم می‌رم ساحل.",
            "level": "B2"
          },
          {
            "en": "Let's hope it doesn't turn into a full-blown thunderstorm.",
            "fa": "امیدواریم به یه طوفان واقعی تبدیل نشه.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "At a Restaurant / Café",
    "scenarios": [
      {
        "scenario": "Ordering food and drinks",
        "context": "At a café or restaurant, ordering a meal.",
        "speakerA": [
          {
            "en": "Table for two, please.",
            "fa": "یه میز برای دو نفر، لطفاً.",
            "level": "A1"
          },
          {
            "en": "Can I see the menu, please?",
            "fa": "لطفاً منو رو می‌تونم ببینم؟",
            "level": "A1"
          },
          {
            "en": "What do you recommend from this menu?",
            "fa": "از این منو چی رو پیشنهاد می‌کنید؟",
            "level": "A2"
          },
          {
            "en": "I'll have the cheeseburger with a side of fries.",
            "fa": "چیزبرگر با سیب‌زمینی سرخ‌کرده می‌خورم.",
            "level": "A2"
          },
          {
            "en": "Could I have my steak medium-rare, please?",
            "fa": "می‌تونم استیکم رو نسبتاً خوناب گرفته باشم؟",
            "level": "B1"
          },
          {
            "en": "Is there any vegetarian option on the menu?",
            "fa": "آیا توی منو گزینه گیاه‌خواری وجود داره؟",
            "level": "B1"
          },
          {
            "en": "I'm afraid this soup is a bit cold. Could you heat it up?",
            "fa": "متأسفم این سوپ کمی سرده. میشه گرمش کنید؟",
            "level": "B2"
          },
          {
            "en": "Could we have the bill/check, please?",
            "fa": "لطفاً صورت‌حساب رو می‌تونیم داشته باشیم؟",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "Right this way. Here's a menu.",
            "fa": "بفرمایید این راه. منو اینجاست.",
            "level": "A1"
          },
          {
            "en": "Of course, I'll be back in a moment.",
            "fa": "حتماً، یه لحظه برمی‌گردم.",
            "level": "A1"
          },
          {
            "en": "The grilled salmon is excellent and very popular.",
            "fa": "ماهی سالمون کبابی عالی و خیلی محبوبه.",
            "level": "A2"
          },
          {
            "en": "Would you like anything to drink with that?",
            "fa": "با این چیزی برای نوشیدن میل دارید؟",
            "level": "A2"
          },
          {
            "en": "Sure, how would you like it cooked?",
            "fa": "حتماً، چطور دوست دارید پخته بشه؟",
            "level": "B1"
          },
          {
            "en": "Yes, we have a delicious vegetable pasta and a salad.",
            "fa": "بله، ما پاستا سبزیجات خوشمزه و سالاد داریم.",
            "level": "B1"
          },
          {
            "en": "I'm very sorry. I'll replace it right away.",
            "fa": "خیلی متأسفم. فوراً عوضش می‌کنم.",
            "level": "B2"
          },
          {
            "en": "Here you are. That comes to $45.70.",
            "fa": "بفرمایید. روی هم می‌شه ۴۵ دلار و ۷۰ سنت.",
            "level": "A2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Shopping (Clothes and General)",
    "scenarios": [
      {
        "scenario": "Buying clothes or asking for prices",
        "context": "At a clothing store, looking for an item.",
        "speakerA": [
          {
            "en": "How much does this shirt cost?",
            "fa": "این پیراهن چنده؟",
            "level": "A1"
          },
          {
            "en": "Do you have this in a larger size?",
            "fa": "این رو سایز بزرگتر دارید؟",
            "level": "A2"
          },
          {
            "en": "I'm just looking, thanks. I'll let you know if I need help.",
            "fa": "فقط دارم نگاه می‌کنم، ممنون. اگه کمک خواستم می‌گم.",
            "level": "A2"
          },
          {
            "en": "Can I try this on? Where are the fitting rooms?",
            "fa": "میشه این رو پرو کنم؟ اتاق پرو کجاست؟",
            "level": "A2"
          },
          {
            "en": "This jacket is a bit too tight. Do you have it in a medium?",
            "fa": "این کت یه کم تنگه. سایز متوسطش رو دارید؟",
            "level": "B1"
          },
          {
            "en": "I'd like to return this pair of shoes. I have the receipt.",
            "fa": "می‌خوام این کفش رو پس بدم. رسیدم رو دارم.",
            "level": "B1"
          },
          {
            "en": "This feels like good quality. Is it on sale?",
            "fa": "به نظر کیفیت خوبی میاد. حراج هست؟",
            "level": "B2"
          },
          {
            "en": "I'll take this one. Can I pay by credit card?",
            "fa": "این یکی رو می‌خرم. می‌تونم با کارت اعتباری پرداخت کنم؟",
            "level": "A2"
          }
        ],
        "speakerB": [
          {
            "en": "It's $29.99.",
            "fa": "۲۹ دلار و ۹۹ سنت است.",
            "level": "A1"
          },
          {
            "en": "Let me check our stock in the back.",
            "fa": "بگذارید موجودی انبار رو چک کنم.",
            "level": "A2"
          },
          {
            "en": "Take your time. Just shout if you need anything.",
            "fa": "وقت بذارید. اگه چیزی خواستید صدا بزنید.",
            "level": "A2"
          },
          {
            "en": "Of course, they're right over there.",
            "fa": "حتماً، اونجا هستند.",
            "level": "A2"
          },
          {
            "en": "I think we have a medium. I'll bring it for you.",
            "fa": "فکر کنم سایز متوسط داریم. برات می‌آورم.",
            "level": "B1"
          },
          {
            "en": "No problem. Let me see the receipt. Would you like a refund or exchange?",
            "fa": "اشکالی نداره. بذارید رسید رو ببینم. پول نقد می‌خواید یا تعویض؟",
            "level": "B1"
          },
          {
            "en": "It's a new arrival, so it's not on sale yet.",
            "fa": "تازه وارد شده، پس هنوز حراج نیست.",
            "level": "B2"
          },
          {
            "en": "Yes, we accept all major credit cards.",
            "fa": "بله، همه کارت‌های اعتباری اصلی رو قبول می‌کنیم.",
            "level": "A2"
          }
        ]
      }
    ]
  },
  {
    "topic": "At a Hotel",
    "scenarios": [
      {
        "scenario": "Checking in and asking about facilities",
        "context": "Arriving at the hotel and checking in.",
        "speakerA": [
          {
            "en": "Hello, I have a reservation under the name Smith.",
            "fa": "سلام، من یه رزرو به اسم اسمیت دارم.",
            "level": "A2"
          },
          {
            "en": "What time is breakfast served?",
            "fa": "صبحانه چه ساعتی سرو می‌شه؟",
            "level": "A1"
          },
          {
            "en": "Is there a gym or swimming pool in the hotel?",
            "fa": "آیا هتل باشگاه یا استخر داره؟",
            "level": "A2"
          },
          {
            "en": "Could I have a room with a view, please?",
            "fa": "میشه یه اتاق با منظره داشته باشم؟",
            "level": "B1"
          },
          {
            "en": "The air conditioning in my room isn't working properly.",
            "fa": "سیستم تهویه اتاقم درست کار نمی‌کنه.",
            "level": "B1"
          },
          {
            "en": "I'd like a wake-up call at 7 AM tomorrow.",
            "fa": "فردا ساعت ۷ صبح زنگ بیدارباش می‌خوام.",
            "level": "B1"
          },
          {
            "en": "I'm afraid I lost my room key. Can I get a new one?",
            "fa": "متأسفم کلید اتاقم رو گم کردم. یه جدید می‌تونم بگیرم؟",
            "level": "B2"
          },
          {
            "en": "I'd like to check out now. Could I settle the bill?",
            "fa": "می‌خوام الان تسویه کنم. میشه صورتحساب رو تسویه کنم؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, Mr. Smith. Let me check you in. Here's your key.",
            "fa": "بله آقای اسمیت. بذارید ثبت ورودتون رو انجام بدم. کلیدتان بفرمایید.",
            "level": "A2"
          },
          {
            "en": "Breakfast is from 7 to 10 AM.",
            "fa": "صبحانه از ۷ تا ۱۰ صبح است.",
            "level": "A1"
          },
          {
            "en": "Yes, we have both on the ground floor.",
            "fa": "بله، هر دو در همکف موجود است.",
            "level": "A2"
          },
          {
            "en": "Let me see what we have available. I'll upgrade you.",
            "fa": "بذارید ببینم چی داریم. اتاقتان را ارتقا می‌دم.",
            "level": "B1"
          },
          {
            "en": "I'm sorry about that. I'll send a technician to fix it now.",
            "fa": "از این بابت متأسفم. یه تکنسین الان می‌فرستم تعمیرش کنه.",
            "level": "B1"
          },
          {
            "en": "Certainly, sir. We'll make sure you get your call.",
            "fa": "حتماً آقا. مطمئن می‌شیم که تماس بگیریم.",
            "level": "B1"
          },
          {
            "en": "Not a problem. I'll deactivate the old one and give you a new key.",
            "fa": "اشکالی نداره. قدیمی رو غیرفعال و یه کلید جدید بهتون می‌دم.",
            "level": "B2"
          },
          {
            "en": "Yes, of course. Let me print your final invoice.",
            "fa": "بله حتماً. بذارید فاکتور نهایی رو پرینت بگیرم.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Health and Doctor's Visit",
    "scenarios": [
      {
        "scenario": "Talking about symptoms and seeing a doctor",
        "context": "Feeling unwell and going to the pharmacy or doctor.",
        "speakerA": [
          {
            "en": "I don't feel well today. I think I'm coming down with something.",
            "fa": "امروز حالم خوب نیست. فکر کنم دارم مریض می‌شم.",
            "level": "A2"
          },
          {
            "en": "I have a headache and a sore throat.",
            "fa": "سردرد و گلودرد دارم.",
            "level": "A2"
          },
          {
            "en": "I need to see a doctor. Is there a clinic nearby?",
            "fa": "باید دکتر ببینم. درمانگاهی نزدیک اینجا هست؟",
            "level": "A2"
          },
          {
            "en": "Do you have anything for a cough and fever?",
            "fa": "برای سرفه و تب چیزی دارید؟",
            "level": "B1"
          },
          {
            "en": "I've been feeling nauseous all morning.",
            "fa": "تمام صبح حالم به هم خورده.",
            "level": "B1"
          },
          {
            "en": "I think I might have an allergic reaction to something I ate.",
            "fa": "فکر کنم به چیزی که خوردم واکنش آلرژیک دارم.",
            "level": "B2"
          },
          {
            "en": "I need to make an appointment with Dr. Johnson for this afternoon.",
            "fa": "باید برای امروز بعد از ظهر با دکتر جانسون وقت بگیرم.",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "You look pale. You should lie down and rest.",
            "fa": "رنگت پریده. باید دراز بکشی و استراحت کنی.",
            "level": "A2"
          },
          {
            "en": "That sounds awful. How long have you had these symptoms?",
            "fa": "وحشتناک به نظر میاد. این علائم رو چند وقته دارید؟",
            "level": "B1"
          },
          {
            "en": "Yes, there's a walk-in clinic just two blocks away.",
            "fa": "بله، یه درمانگاه بدون نوبت فقط دو خیابون اونورتره.",
            "level": "A2"
          },
          {
            "en": "I recommend this syrup for the cough and these tablets for fever.",
            "fa": "این شربت رو برای سرفه و این قرص‌ها رو برای تب توصیه می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Have you tried drinking ginger tea? It helps with nausea.",
            "fa": "چای زنجبیل رو امتحان کردید؟ به حالت تهوع کمک می‌کنه.",
            "level": "B1"
          },
          {
            "en": "Stay calm. I'll call an ambulance if it gets worse.",
            "fa": "آروم باش. اگه بدتر شد آمبولانس می‌گیرم.",
            "level": "B2"
          },
          {
            "en": "He is fully booked today. The earliest slot is tomorrow morning at 10.",
            "fa": "امروز کاملاً پر است. اولین نوبت موجود فردا صبح ساعت ۱۰ هست.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Asking for Directions / Landmarks",
    "scenarios": [
      {
        "scenario": "Finding a specific place on foot or by car",
        "context": "A person is lost and asks a stranger for directions.",
        "speakerA": [
          {
            "en": "Excuse me, where is the nearest restroom?",
            "fa": "ببخشید، نزدیک‌ترین دستشویی کجاست؟",
            "level": "A1"
          },
          {
            "en": "How do I get to the National Museum from here?",
            "fa": "چطور از اینجا به موزه ملی برسم؟",
            "level": "A2"
          },
          {
            "en": "Is this the right way to the train station?",
            "fa": "آیا این راه درست برای رسیدن به ایستگاه قطاره؟",
            "level": "A2"
          },
          {
            "en": "Could you tell me where the nearest subway station is?",
            "fa": "میشه بگید نزدیک‌ترین ایستگاه مترو کجاست؟",
            "level": "B1"
          },
          {
            "en": "I'm looking for 5th Avenue. Am I anywhere close?",
            "fa": "دنبال خیابان پنجم می‌گردم. آیا نزدیکم؟",
            "level": "B1"
          },
          {
            "en": "Is there a pharmacy around here that's open 24 hours?",
            "fa": "آیا این حوالی داروخانه‌ای هست که ۲۴ ساعته باز باشه؟",
            "level": "B1"
          },
          {
            "en": "Could you please mark it on my map? I'm terrible with directions.",
            "fa": "میشه لطفاً روی نقشه‌ام علامت بزنید؟ من جهت‌یابی رو بلد نیستم.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "It's just on the first floor, next to the elevator.",
            "fa": "همون طبقه اول، کنار آسانسوره.",
            "level": "A1"
          },
          {
            "en": "Go straight ahead for two blocks, then turn left. You can't miss it.",
            "fa": "دو بلوک برید مستقیم، بعد بپیچید چپ. پیداش می‌کنید.",
            "level": "A2"
          },
          {
            "en": "Actually, you're going the wrong way. You need to turn around.",
            "fa": "در واقع دارید اشتباه می‌رید. باید برگردید.",
            "level": "A2"
          },
          {
            "en": "Take the first right, then the second left. It's across from the bank.",
            "fa": "اولین خیابان رو برید راست، بعد دومی رو چپ. روبروی بانکه.",
            "level": "B1"
          },
          {
            "en": "You are quite close. It's about a 5-minute walk from here.",
            "fa": "نسبتاً نزدیکید. حدود ۵ دقیقه پیاده‌روی از اینجا فاصله داره.",
            "level": "B1"
          },
          {
            "en": "Yes, there's one on the corner of 2nd and Maple. It's always open.",
            "fa": "بله، یکی در گوشه خیابان دوم و میپل هست. همیشه بازه.",
            "level": "B1"
          },
          {
            "en": "Sure, let me draw the route for you. Go straight until you see a big fountain.",
            "fa": "حتماً، بذارید مسیر رو براتون بکشم. مستقیم برید تا یه فواره بزرگ ببینید.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Plans and Free Time (Hobbies)",
    "scenarios": [
      {
        "scenario": "Discussing weekend plans and hobbies",
        "context": "Talking about what to do in free time or upcoming events.",
        "speakerA": [
          {
            "en": "What are you doing this weekend?",
            "fa": "این آخر هفته چیکار می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "Do you have any plans for the holiday?",
            "fa": "برای تعطیلات برنامه‌ای داری؟",
            "level": "A2"
          },
          {
            "en": "I'm thinking of going to the cinema. Would you like to join?",
            "fa": "دارم به سینما رفتن فکر می‌کنم. دوست داری بیای؟",
            "level": "A2"
          },
          {
            "en": "I usually play football with my friends on Saturdays.",
            "fa": "معمولاً شنبه‌ها با دوستام فوتبال بازی می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I've taken up painting as a new hobby. It's quite relaxing.",
            "fa": "تازه نقاشی رو به عنوان یه سرگرمی شروع کردم. خیلی آرامش‌بخشه.",
            "level": "B2"
          },
          {
            "en": "Let's catch up over a coffee sometime. When are you free?",
            "fa": "یه وقتایی بریم یه قهوه بخوریم و گپ بزنیم. کی آزادی؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "I haven't decided yet. Probably just stay home and relax.",
            "fa": "هنوز تصمیم نگرفتم. احتمالاً فقط می‌مونم خونه و استراحت می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I'm going to visit my parents. It's been a while.",
            "fa": "می‌رم به دیدار پدر و مادرم. مدتی هست که نرفتم.",
            "level": "A2"
          },
          {
            "en": "That sounds fun! What movie are you going to see?",
            "fa": "خوش می‌گذره! چه فیلمی می‌خواین ببینید؟",
            "level": "A2"
          },
          {
            "en": "That's great. I prefer hiking myself. Do you like nature?",
            "fa": "عالیه. من خودم پیاده‌روی تو کوه رو ترجیح می‌دم. طبیعت رو دوست داری؟",
            "level": "B1"
          },
          {
            "en": "Really? That's interesting. I've always wanted to learn how to paint.",
            "fa": "واقعاً؟ جالبه. من همیشه می‌خواستم نقاشی یاد بگیرم.",
            "level": "B2"
          },
          {
            "en": "I'm free on Wednesday after 4 PM. Let's meet at that new café downtown.",
            "fa": "چهارشنبه بعد از ۴ عصر آزادم. بیا همون کافه جدید مرکز شهر.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Work and Workplace",
    "scenarios": [
      {
        "scenario": "Talking about jobs and daily work routine",
        "context": "Colleagues or friends discuss their work and responsibilities.",
        "speakerA": [
          {
            "en": "Where do you work these days?",
            "fa": "این روزها کجا کار می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "How many hours do you work a day?",
            "fa": "روزی چند ساعت کار می‌کنی؟",
            "level": "A2"
          },
          {
            "en": "Do you enjoy your job?",
            "fa": "از شغلت لذت می‌بری؟",
            "level": "A2"
          },
          {
            "en": "I've got a new project at work. It's really challenging.",
            "fa": "یه پروژه جدید سر کار گرفتم. واقعاً چالش‌برانگیزه.",
            "level": "B1"
          },
          {
            "en": "My boss is very understanding and supportive.",
            "fa": "رئیسم خیلی فهمیده و حامی است.",
            "level": "B2"
          },
          {
            "en": "I'm thinking about changing careers. I need a fresh start.",
            "fa": "به تغییر شغل فکر می‌کنم. یه شروع تازه نیاز دارم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I work at a bank downtown.",
            "fa": "توی یه بانک مرکز شهر کار می‌کنم.",
            "level": "A1"
          },
          {
            "en": "Usually around 8 hours, sometimes more.",
            "fa": "معمولاً حدود ۸ ساعت، بعضی وقتا بیشتر.",
            "level": "A2"
          },
          {
            "en": "Yes, I love it. It keeps me busy and I learn a lot.",
            "fa": "بله، عاشقشم. منو سرگرم می‌کنه و کلی یاد می‌گیرم.",
            "level": "A2"
          },
          {
            "en": "That sounds interesting! What's it about?",
            "fa": "به نظر جالب میاد! درباره‌ش چیه؟",
            "level": "B1"
          },
          {
            "en": "You're lucky. Mine is quite strict and demanding.",
            "fa": "خوش‌شانسی. مال من خیلی سخت‌گیر و پرتوقع است.",
            "level": "B2"
          },
          {
            "en": "That's a big decision. What field are you considering?",
            "fa": "تصمیم بزرگیه. به چه زمینه‌ای فکر می‌کنی؟",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Meeting colleagues or work-related questions",
        "context": "In a meeting or office environment, asking about tasks and schedules.",
        "speakerA": [
          {
            "en": "Are you busy right now? Can I talk to you?",
            "fa": "الان مشغولی؟ می‌تونم باهات صحبت کنم؟",
            "level": "A2"
          },
          {
            "en": "What's on your to-do list for today?",
            "fa": "امروز چه کارهایی داری انجام بدی؟",
            "level": "B1"
          },
          {
            "en": "Could you help me with this report? I'm stuck on the third page.",
            "fa": "میشه تو این گزارش کمکم کنی؟ توی صفحه سوم گیر کردم.",
            "level": "B1"
          },
          {
            "en": "When is the deadline for this project?",
            "fa": "ددلاین این پروژه کیه؟",
            "level": "A2"
          },
          {
            "en": "I'm going to be late for work today. My car broke down.",
            "fa": "امروز سر کار دیر می‌رسیم. ماشینم خراب شده.",
            "level": "B1"
          },
          {
            "en": "Let's schedule a meeting for next Tuesday to go over the details.",
            "fa": "یه جلسه برای سه‌شنبه آینده بذاریم تا جزئیات رو مرور کنیم.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Sure, come in. I have a few minutes.",
            "fa": "حتماً، بیا داخل. چند دقیقه وقت دارم.",
            "level": "A2"
          },
          {
            "en": "I have to finish the sales report and call some clients.",
            "fa": "باید گزارش فروش رو تموم کنم و به چندتا مشتری زنگ بزنم.",
            "level": "B1"
          },
          {
            "en": "Let me take a look. I think you missed a formula here.",
            "fa": "بذارید نگاه کنم. فکر کنم یه فرمول اینجا جا گذاشتید.",
            "level": "B1"
          },
          {
            "en": "The deadline is this Friday at 5 PM.",
            "fa": "ددلاین جمعه این هفته ساعت ۵ عصر است.",
            "level": "A2"
          },
          {
            "en": "No problem. Just let the team know so we can adjust.",
            "fa": "اشکالی نداره. به تیم خبر بده تا تنظیم کنیم.",
            "level": "B1"
          },
          {
            "en": "Perfect. I'll send out the invites shortly.",
            "fa": "عالیه. دعوت‌نامه‌ها رو به زودی می‌فرستم.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Time and Appointments",
    "scenarios": [
      {
        "scenario": "Asking and telling the time and making appointments",
        "context": "People ask about time, set up meetings or get-togethers.",
        "speakerA": [
          {
            "en": "Excuse me, what time is it?",
            "fa": "ببخشید، ساعت چند است؟",
            "level": "A1"
          },
          {
            "en": "Do you have the time?",
            "fa": "ساعت داری؟",
            "level": "A1"
          },
          {
            "en": "When should we meet?",
            "fa": "کی باید همدیگر را ببینیم؟",
            "level": "A2"
          },
          {
            "en": "What time does the movie start?",
            "fa": "فیلم چه ساعتی شروع می‌شه؟",
            "level": "A2"
          },
          {
            "en": "Can we postpone our meeting to 3 PM? I'm running late.",
            "fa": "میشه جلسه‌مون رو به ساعت ۳ موکول کنیم؟ دارم دیر می‌شم.",
            "level": "B1"
          },
          {
            "en": "Let's confirm the date: Are we meeting on the 15th or the 16th?",
            "fa": "بیا تاریخ رو تأیید کنیم: جلسه ما پانزدهمه یا شانزدهم؟",
            "level": "B2"
          },
          {
            "en": "I'm free anytime after 4 PM. What suits you best?",
            "fa": "بعد از ۴ عصر هر وقتی آزادم. چه زمانی برات بهتره؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "It's 10:30.",
            "fa": "ساعت ۱۰:۳۰ است.",
            "level": "A1"
          },
          {
            "en": "I think my watch says 3:15.",
            "fa": "فکر کنم ساعت‌م ۳:۱۵ رو نشون میده.",
            "level": "A1"
          },
          {
            "en": "How about 6 o'clock in the evening?",
            "fa": "ساعت ۶ عصر چطوره؟",
            "level": "A2"
          },
          {
            "en": "It starts at 7 PM. We should leave at 6.",
            "fa": "ساعت ۷ شب شروع می‌شه. باید ساعت ۶ حرکت کنیم.",
            "level": "A2"
          },
          {
            "en": "Sure, 3 PM is fine. I'll adjust my schedule.",
            "fa": "حتماً، ساعت ۳ خوبه. برنامه‌ام رو تنظیم می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I believe it's the 15th. Let me double-check my calendar.",
            "fa": "فکر می‌کنم پانزدهم باشه. بذارید تقویمم رو دوباره چک کنم.",
            "level": "B2"
          },
          {
            "en": "4 PM sounds perfect. I'll see you then.",
            "fa": "ساعت ۴ عالی به نظر میاد. پس همون موقع می‌بینمت.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Expressing Opinions and Feelings",
    "scenarios": [
      {
        "scenario": "Sharing views on different topics",
        "context": "Two people discuss a movie, food, or event and give their opinion.",
        "speakerA": [
          {
            "en": "What do you think about this movie?",
            "fa": "نظرت درباره این فیلم چیه؟",
            "level": "A2"
          },
          {
            "en": "I really liked the food at that restaurant.",
            "fa": "من واقعاً غذاهای اون رستوران رو دوست داشتم.",
            "level": "A2"
          },
          {
            "en": "In my opinion, traveling is the best way to learn new cultures.",
            "fa": "به نظر من، سفر بهترین راه برای یادگیری فرهنگ‌های جدید است.",
            "level": "B1"
          },
          {
            "en": "I feel that we should focus more on our environment.",
            "fa": "احساس می‌کنم باید بیشتر روی محیط‌زیست تمرکز کنیم.",
            "level": "B2"
          },
          {
            "en": "To be honest, I'm not a big fan of horror movies. They scare me too much.",
            "fa": "راستش، من زیاد طرفدار فیلم‌های ترسناک نیستم. بیش از حد می‌ترسوننم.",
            "level": "B2"
          },
          {
            "en": "From my perspective, this decision will benefit the whole team.",
            "fa": "از دیدگاه من، این تصمیم به نفع کل تیم خواهد بود.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "It was okay. I liked the ending.",
            "fa": "بد نبود. از پایانش خوشم اومد.",
            "level": "A2"
          },
          {
            "en": "Me too! The pasta was delicious.",
            "fa": "منم همینطور! پاستاش عالی بود.",
            "level": "A2"
          },
          {
            "en": "I agree. You get to see how other people really live.",
            "fa": "موافقم. می‌بینی که مردم دیگه واقعاً چطور زندگی می‌کنن.",
            "level": "B1"
          },
          {
            "en": "That's true, but we also need to balance it with economic growth.",
            "fa": "درسته، اما باید با رشد اقتصادی هم تعادلش کنیم.",
            "level": "B2"
          },
          {
            "en": "I know what you mean. I prefer comedies; they lift my mood.",
            "fa": "می‌دونم منظورت چیه. من کمدی رو ترجیح می‌دم؛ روحیه‌م رو عالی می‌کنن.",
            "level": "B2"
          },
          {
            "en": "I see your point, but we should consider the risks involved as well.",
            "fa": "متوجه منظورت می‌شم، اما باید ریسک‌های مربوطه رو هم در نظر بگیریم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Asking for Help and Clarification",
    "scenarios": [
      {
        "scenario": "Requesting assistance or repetition",
        "context": "In daily life, asking someone for help or to repeat something.",
        "speakerA": [
          {
            "en": "Could you please help me with this bag? It's too heavy.",
            "fa": "میشه لطفاً تو این کیف کمکم کنی؟ خیلی سنگینه.",
            "level": "A1"
          },
          {
            "en": "I'm sorry, I didn't understand. Could you repeat that?",
            "fa": "ببخشید، متوجه نشدم. میشه دوباره بگید؟",
            "level": "A2"
          },
          {
            "en": "Could you speak a little more slowly, please?",
            "fa": "میشه لطفاً کمی آهسته‌تر صحبت کنید؟",
            "level": "A2"
          },
          {
            "en": "Would you mind helping me with this math problem?",
            "fa": "میشه کمکم کنید این مسئله ریاضی رو حل کنم؟",
            "level": "B1"
          },
          {
            "en": "I'm looking for the post office. Could you show me on the map?",
            "fa": "دنبال اداره پست می‌گردم. میشه روی نقشه نشونم بدید؟",
            "level": "B1"
          },
          {
            "en": "Do you have any idea how to get this application to work?",
            "fa": "نظری ندارید چطور این برنامه رو راه بندازم؟",
            "level": "B2"
          },
          {
            "en": "I hate to bother you, but could you lend me a pen for a moment?",
            "fa": "از اینکه مزاحم می‌شم خجالت می‌کشم، اما میشه یه لحظه خودکارتون رو قرض بگیرم؟",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Sure, let me give you a hand.",
            "fa": "حتماً، بذارید کمک کنم.",
            "level": "A1"
          },
          {
            "en": "Of course. I said we need to finish the report by Friday.",
            "fa": "حتماً. گفتم باید گزارش رو تا جمعه تموم کنیم.",
            "level": "A2"
          },
          {
            "en": "Yes, sorry. I'll try to speak more clearly.",
            "fa": "بله، ببخشید. سعی می‌کنم واضح‌تر صحبت کنم.",
            "level": "A2"
          },
          {
            "en": "I can try, but it's been a while since I did math.",
            "fa": "می‌تونم امتحان کنم، اما مدتی هست ریاضی کار نکردم.",
            "level": "B1"
          },
          {
            "en": "Sure, it's right here. See this red marker?",
            "fa": "حتماً، اینجاست. این علامت قرمز رو می‌بینید؟",
            "level": "B1"
          },
          {
            "en": "Actually, you need to restart the computer first.",
            "fa": "در واقع، اول باید کامپیوتر رو ری‌استارت کنید.",
            "level": "B2"
          },
          {
            "en": "Not at all. Here you go.",
            "fa": "خواهش می‌کنم. بفرمایید.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Politeness and Compliments",
    "scenarios": [
      {
        "scenario": "Giving compliments and responding politely",
        "context": "People express appreciation or admiration towards others.",
        "speakerA": [
          {
            "en": "You look great today! Is that a new dress?",
            "fa": "امروز عالی به نظر می‌رسی! این یه لباس جدید هست؟",
            "level": "A2"
          },
          {
            "en": "I love your hair. It really suits you.",
            "fa": "موهات رو خیلی دوست دارم. خیلی بهت میاد.",
            "level": "A2"
          },
          {
            "en": "That was a really good presentation. You did a fantastic job!",
            "fa": "ارائه واقعاً خوبی بود. کار عالی انجام دادی!",
            "level": "B1"
          },
          {
            "en": "I must say, your house is beautifully decorated.",
            "fa": "باید بگم، خونه‌ات زیبا تزیین شده.",
            "level": "B1"
          },
          {
            "en": "You have a wonderful taste in music. This playlist is amazing.",
            "fa": "سلیقه‌ات در موسیقی فوق‌العاده است. این پلی‌لیست عالیه.",
            "level": "B2"
          },
          {
            "en": "I appreciate you helping me out so quickly. You're a lifesaver!",
            "fa": "ممنون که این سریع کمکم کردی. نجاتم دادی!",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Thanks! Yes, I got it last week.",
            "fa": "ممنون! آره، هفته پیش خریدمش.",
            "level": "A2"
          },
          {
            "en": "Oh, really? Thank you! I just styled it differently today.",
            "fa": "اوه، واقعاً؟ ممنون! امروز فقط یه جور دیگه حالتش دادم.",
            "level": "A2"
          },
          {
            "en": "Thank you so much! I was really nervous, so I'm glad it went well.",
            "fa": "خیلی ممنون! خیلی عصبی بودم، پس خوشحالم که خوب پیش رفت.",
            "level": "B1"
          },
          {
            "en": "That's very kind of you to say. I did it all myself!",
            "fa": "لطف دارید. خودم همه‌اش رو انجام دادم!",
            "level": "B1"
          },
          {
            "en": "Thank you! I'm glad you're enjoying it.",
            "fa": "ممنون! خوشحالم که ازش لذت می‌برید.",
            "level": "B2"
          },
          {
            "en": "Anytime! That's what friends are for.",
            "fa": "هر وقت! دوستان برای همین هستند.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Travel and Experiences",
    "scenarios": [
      {
        "scenario": "Talking about past travels and experiences abroad",
        "context": "People share stories and memories of their trips.",
        "speakerA": [
          {
            "en": "Have you ever been to Italy?",
            "fa": "تا حالا به ایتالیا رفته‌ای؟",
            "level": "A2"
          },
          {
            "en": "What's the best place you've ever visited?",
            "fa": "بهترین جایی که تا حالا دیدی کجاست؟",
            "level": "B1"
          },
          {
            "en": "I went to Japan last year. It was an amazing experience!",
            "fa": "پارسال به ژاپن رفتم. تجربه فوق‌العاده‌ای بود!",
            "level": "B1"
          },
          {
            "en": "The food in Thailand was incredibly tasty and diverse.",
            "fa": "غذاهای تایلند فوق‌العاده خوشمزه و متنوع بود.",
            "level": "B2"
          },
          {
            "en": "I'd love to go hiking in the Alps someday. The scenery looks breathtaking.",
            "fa": "دوست دارم یه روزی تو کوه‌های آلپ پیاده‌روی کنم. منظره‌اش نفس‌گیر به نظر میاد.",
            "level": "C1"
          },
          {
            "en": "How did you find the people and culture in Mexico?",
            "fa": "مردم و فرهنگ مکزیک رو چطور دیدی؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "No, but I've always wanted to go there.",
            "fa": "نه، اما همیشه دوست داشتم برم اونجا.",
            "level": "A2"
          },
          {
            "en": "That's hard to choose! Maybe the beaches in Bali.",
            "fa": "انتخابش سخته! شاید سواحل بالی.",
            "level": "B1"
          },
          {
            "en": "Wow, I've heard so much about Japan. What did you like most?",
            "fa": "واو، کلی درباره ژاپن شنیدم. بیشتر از همه چی رو دوست داشتی؟",
            "level": "B1"
          },
          {
            "en": "I've been to Thailand too! The street food was my favorite.",
            "fa": "منم به تایلند رفته‌م! غذای خیابونی بیشتر از همه دوست داشتم.",
            "level": "B2"
          },
          {
            "en": "I have to say, the Swiss Alps are unforgettable. You should definitely go!",
            "fa": "باید بگم، آلپ سوئیس فراموش‌نشدنیه. حتماً باید بری!",
            "level": "C1"
          },
          {
            "en": "They were very friendly and welcoming. The food was a bit spicy for me though.",
            "fa": "خیلی دوستانه و خونگرم بودن. غذاها برام یه کم تند بودن.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Apologies and Forgiveness",
    "scenarios": [
      {
        "scenario": "Saying sorry and accepting apologies",
        "context": "Someone makes a mistake and apologizes, the other responds.",
        "speakerA": [
          {
            "en": "I'm so sorry! I didn't mean to step on your foot.",
            "fa": "خیلی متأسفم! عمداً پات رو نگذاشتم.",
            "level": "A2"
          },
          {
            "en": "I apologize for being late. The traffic was terrible.",
            "fa": "بابت دیر رسیدن عذرخواهی می‌کنم. ترافیک وحشتناک بود.",
            "level": "A2"
          },
          {
            "en": "I'm really sorry about the misunderstanding. It was my fault.",
            "fa": "واقعاً بابت سوءتفاهم معذرت می‌خوام. تقصیر من بود.",
            "level": "B1"
          },
          {
            "en": "Please forgive me for forgetting your birthday. I feel awful.",
            "fa": "ببخشید که تولدت رو فراموش کردم. حسابی شرمنده‌ام.",
            "level": "B1"
          },
          {
            "en": "I can't believe I broke your glass. I'll buy you a new one.",
            "fa": "باورم نمیشه لیوانت رو شکستم. یه جدید برات می‌خرم.",
            "level": "B1"
          },
          {
            "en": "I must apologize for my behavior yesterday. I was under a lot of stress.",
            "fa": "باید بابت رفتار دیروزم عذرخواهی کنم. خیلی تحت فشار بودم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Oh, no problem at all! It was my fault for standing too close.",
            "fa": "اوه، اصلاً اشکالی نداره! تقصیر خودم بود که خیلی نزدیک ایستاده بودم.",
            "level": "A2"
          },
          {
            "en": "Don't worry about it. It happens to everyone.",
            "fa": "نگران نباش. برای همه پیش میاد.",
            "level": "A2"
          },
          {
            "en": "It's okay. I understand that you didn't mean it.",
            "fa": "اشکالی نداره. می‌دونم که عمدی نبود.",
            "level": "B1"
          },
          {
            "en": "Of course, I forgive you. Just don't do it again!",
            "fa": "حتماً، می‌بخشم. فقط دیگه تکرار نکن!",
            "level": "B1"
          },
          {
            "en": "That's very thoughtful of you. Thank you.",
            "fa": "خیلی با ملاحظه‌ای. ممنون.",
            "level": "B1"
          },
          {
            "en": "I appreciate the apology. Let's just move forward.",
            "fa": "از عذرخواهیت قدردانی می‌کنم. بذارین جلو بریم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Family and Cultural Questions",
    "scenarios": [
      {
        "scenario": "Discussing family background, traditions and local culture",
        "context": "People talk about their families and cultural habits.",
        "speakerA": [
          {
            "en": "How many brothers and sisters do you have?",
            "fa": "چند تا برادر و خواهر داری؟",
            "level": "A1"
          },
          {
            "en": "Do you live with your family?",
            "fa": "با خانواده‌ات زندگی می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "Are there any special festivals or holidays you celebrate in your country?",
            "fa": "توی کشورتون جشن‌ها یا تعطیلات خاصی دارید که جشن می‌گیرید؟",
            "level": "A2"
          },
          {
            "en": "What is the typical food in your hometown?",
            "fa": "غذای معروف شهر شما چیه؟",
            "level": "A2"
          },
          {
            "en": "In my culture, we always greet older people with respect.",
            "fa": "در فرهنگ ما، همیشه به بزرگ‌ترها با احترام سلام می‌کنیم.",
            "level": "B1"
          },
          {
            "en": "Do you have any family traditions during New Year?",
            "fa": "توی سال نو هیچ سنت خانوادگی دارید؟",
            "level": "B2"
          },
          {
            "en": "I'm really curious about your customs. Could you tell me more about them?",
            "fa": "واقعاً درباره رسوم شما کنجکاوم. می‌تونی بیشتر درباره‌شون بگی؟",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I have one brother and no sisters.",
            "fa": "یه برادر دارم و خواهر ندارم.",
            "level": "A1"
          },
          {
            "en": "No, I live alone in an apartment near the station.",
            "fa": "نه، تو یه آپارتمان نزدیک ایستگاه تنها زندگی می‌کنم.",
            "level": "A1"
          },
          {
            "en": "Yes, we celebrate Nowruz, which is the Persian New Year.",
            "fa": "بله، ما نوروز رو جشن می‌گیریم که سال نو ایرانی هست.",
            "level": "A2"
          },
          {
            "en": "We have a dish called 'Chelo Kebab' which is very popular.",
            "fa": "ما یه غذای معروف به نام 'چلو کباب' داریم که خیلی محبوبه.",
            "level": "A2"
          },
          {
            "en": "That's beautiful. In our country, we also respect the elderly a lot.",
            "fa": "خیلی قشنگه. تو کشور ما هم به سالمندان خیلی احترام می‌ذاریم.",
            "level": "B1"
          },
          {
            "en": "Usually we visit relatives and give presents to children.",
            "fa": "معمولاً به دیدار اقوام می‌رویم و به بچه‌ها هدیه می‌دهیم.",
            "level": "B2"
          },
          {
            "en": "Of course! I'd love to. Ask me anything you like.",
            "fa": "حتماً! خیلی دوست دارم. هر چی دوست داری بپرس.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Sports and Fitness",
    "scenarios": [
      {
        "scenario": "Talking about sports you play or follow",
        "context": "Two people discuss their favorite sports or fitness routines.",
        "speakerA": [
          {
            "en": "Do you like sports?",
            "fa": "آیا ورزش رو دوست داری؟",
            "level": "A1"
          },
          {
            "en": "What's your favorite sport to watch on TV?",
            "fa": "محبوب‌ترین ورزش برای تماشا از تلویزیون چیه؟",
            "level": "A2"
          },
          {
            "en": "I go jogging every morning before work. It keeps me fit.",
            "fa": "هر روز صبح قبل از کار می‌رم دویدن. تناسب اندامم رو حفظ می‌کنه.",
            "level": "B1"
          },
          {
            "en": "I used to play football, but now I prefer swimming.",
            "fa": "قبلاً فوتبال بازی می‌کردم، اما الان شنا رو ترجیح می‌دم.",
            "level": "B1"
          },
          {
            "en": "Have you ever tried yoga? It's great for both body and mind.",
            "fa": "تا حالا یوگا رو امتحان کردی؟ هم برای بدن و هم برای ذهن عالیه.",
            "level": "B2"
          },
          {
            "en": "I'm training for a marathon next month. I run about 50 kilometers a week.",
            "fa": "برای یه ماراتن ماه دیگه تمرین می‌کنم. هفته‌ای حدود ۵۰ کیلومتر می‌دوم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I love playing tennis.",
            "fa": "بله، عاشق تنیس بازی کردنم.",
            "level": "A1"
          },
          {
            "en": "I really enjoy watching basketball, especially the NBA.",
            "fa": "واقعاً از تماشای بسکتبال لذت می‌برم، مخصوصاً ان‌بی‌ای.",
            "level": "A2"
          },
          {
            "en": "That's great! I prefer cycling on the weekends.",
            "fa": "عالیه! من آخر هفته‌ها دوچرخه‌سواری رو ترجیح می‌دم.",
            "level": "B1"
          },
          {
            "en": "Swimming is fantastic. I should try it more often.",
            "fa": "شنا فوق‌العاده‌ست. باید بیشتر امتحانش کنم.",
            "level": "B1"
          },
          {
            "en": "I haven't, but I've heard good things about it. Maybe I'll join a class.",
            "fa": "نه، اما چیزهای خوبی درباره‌ش شنیدم. شاید برم یه کلاس.",
            "level": "B2"
          },
          {
            "en": "Wow, that's impressive! How do you find the time with your busy schedule?",
            "fa": "واو، قابل تحسینه! با برنامه شلوغت چطور وقتش رو پیدا می‌کنی؟",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Asking about gym or fitness activities",
        "context": "In a gym or talking about exercise classes.",
        "speakerA": [
          {
            "en": "Is there a gym near here?",
            "fa": "نزدیک اینجا باشگاه ورزشی هست؟",
            "level": "A1"
          },
          {
            "en": "How much is the monthly membership?",
            "fa": "عضویت ماهیانه چنده؟",
            "level": "A2"
          },
          {
            "en": "Do you offer any group classes like Zumba or Pilates?",
            "fa": "کلاس‌های گروهی مثل زومبا یا پیلاتس دارید؟",
            "level": "B1"
          },
          {
            "en": "What time does the gym open in the morning?",
            "fa": "باشگاه صبح چه ساعتی باز می‌شه؟",
            "level": "A2"
          },
          {
            "en": "I'm looking for a personal trainer. Do you have any available?",
            "fa": "دنبال مربی شخصی می‌گردم. کسی در دسترس دارید؟",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, there's one on the next street.",
            "fa": "بله، یکی تو خیابون بعدی هست.",
            "level": "A1"
          },
          {
            "en": "It's $50 per month, with a one-time registration fee.",
            "fa": "۵۰ دلار در ماه، با هزینه ثبت‌نام یک‌باره.",
            "level": "A2"
          },
          {
            "en": "We have yoga, spinning, and HIIT classes every day.",
            "fa": "ما هر روز کلاس یوگا، اسپینینگ و اچ‌آی‌آی‌تی داریم.",
            "level": "B1"
          },
          {
            "en": "We open at 6 AM and close at 11 PM.",
            "fa": "ساعت ۶ صبح باز و ۱۱ شب تعطیل می‌کنیم.",
            "level": "A2"
          },
          {
            "en": "Yes, we have three certified trainers. I can schedule a free consultation.",
            "fa": "بله، سه مربی معتبر داریم. می‌تونم یه مشاوره رایگان تنظیم کنم.",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Technology and Communication",
    "scenarios": [
      {
        "scenario": "Talking about devices and apps",
        "context": "People discuss their phones, social media, or online habits.",
        "speakerA": [
          {
            "en": "What kind of phone do you have?",
            "fa": "چه نوع گوشی‌ای داری؟",
            "level": "A1"
          },
          {
            "en": "Are you on social media? I'd like to connect with you.",
            "fa": "توی شبکه‌های اجتماعی هستی؟ دوست دارم باهات ارتباط برقرار کنم.",
            "level": "A2"
          },
          {
            "en": "I spend too much time on my phone these days. I need to cut back.",
            "fa": "این روزا بیش از حد وقت رو گوشیم می‌ذارم. باید کم کنم.",
            "level": "B1"
          },
          {
            "en": "Have you tried any of the new AI tools? They're incredibly useful.",
            "fa": "ابزارهای جدید هوش مصنوعی رو امتحان کردی؟ فوق‌العاده مفید هستن.",
            "level": "B2"
          },
          {
            "en": "I prefer using messaging apps over calling. It's more convenient.",
            "fa": "ارسال پیام رو به تماس تلفنی ترجیح می‌دم. راحت‌تره.",
            "level": "B2"
          },
          {
            "en": "My laptop crashed yesterday and I lost all my files. I'm devastated!",
            "fa": "دیروز لپ‌تاپم هنگ کرد و همه فایل‌هام رو از دست دادم. حسابی ناراحتم!",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I have an iPhone. It's the newest model.",
            "fa": "آیفون دارم. جدیدترین مدلشه.",
            "level": "A1"
          },
          {
            "en": "Yeah, I'm on Instagram and WhatsApp. What's your username?",
            "fa": "آره، توی اینستاگرام و واتس‌اپ هستم. اسم کاربریت چیه؟",
            "level": "A2"
          },
          {
            "en": "I know the feeling. I try to keep my screen time under two hours a day.",
            "fa": "حالت رو می‌دونم. سعی می‌کنم زمان استفاده از صفحه رو زیر دو ساعت در روز نگه دارم.",
            "level": "B1"
          },
          {
            "en": "Not yet. Are they easy to use?",
            "fa": "نه هنوز. استفاده ازشون راحته؟",
            "level": "B2"
          },
          {
            "en": "I agree. It's faster and I can reply whenever I want.",
            "fa": "موافقم. سریع‌تره و هر وقت بخوام می‌تونم جواب بدم.",
            "level": "B2"
          },
          {
            "en": "Oh no! Did you have a backup? Maybe you can recover them.",
            "fa": "اوه نه! پشتیبان داشتی؟ شاید بتونی بازیابیش کنی.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Asking for help with technology",
        "context": "Someone needs assistance with a device or software.",
        "speakerA": [
          {
            "en": "My Wi-Fi isn't working. What should I do?",
            "fa": "وای‌فای‌م کار نمی‌کنه. چیکار کنم؟",
            "level": "A2"
          },
          {
            "en": "Can you help me set up this app on my phone?",
            "fa": "میشه کمکم کنی این برنامه رو روی گوشیم نصب کنم؟",
            "level": "A2"
          },
          {
            "en": "I don't understand how to send a file by email. Could you show me?",
            "fa": "نمی‌دونم چطور یه فایل با ایمیل بفرستم. میشه بهم نشون بدی؟",
            "level": "B1"
          },
          {
            "en": "My screen keeps freezing. I think there's a virus.",
            "fa": "صفحه‌ام مدام یخ می‌زنه. فکر کنم ویروس داره.",
            "level": "B1"
          },
          {
            "en": "Could you recommend a good editing software for photos?",
            "fa": "میشه یه نرم‌افزار خوب برای ویرایش عکس پیشنهاد بدی؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Try restarting your router. That usually works.",
            "fa": "روتر رو ری‌استارت کن. معمولاً جواب میده.",
            "level": "A2"
          },
          {
            "en": "Sure, let me see your phone. I'll install it for you.",
            "fa": "حتماً، بذارید گوشیتون رو ببینم. نصبش می‌کنم.",
            "level": "A2"
          },
          {
            "en": "Yes, just open your email, click on 'attach file,' and select it.",
            "fa": "بله، فقط ایمیل رو باز کن، روی 'پیوست فایل' کلیک کن و انتخابش کن.",
            "level": "B1"
          },
          {
            "en": "You might need to run an antivirus scan. I can help you with that.",
            "fa": "شاید باید یه اسکن آنتی‌ویروس اجرا کنی. می‌تونم توش کمک کنم.",
            "level": "B1"
          },
          {
            "en": "I recommend Lightroom for professionals, or Snapseed for quick edits.",
            "fa": "لایت‌روم رو برای حرفه‌ای‌ها توصیه می‌کنم، یا اسنپ‌سید برای ویرایش سریع.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Holidays and Celebrations",
    "scenarios": [
      {
        "scenario": "Talking about upcoming holidays and traditions",
        "context": "People discuss plans for holidays like New Year, Christmas, or Nowruz.",
        "speakerA": [
          {
            "en": "Do you celebrate Christmas in your country?",
            "fa": "توی کشور شما کریسمس رو جشن می‌گیرید؟",
            "level": "A1"
          },
          {
            "en": "What are your plans for New Year's Eve?",
            "fa": "برنامه‌ات برای شب سال نو چیه؟",
            "level": "A2"
          },
          {
            "en": "In my family, we always have a big dinner on New Year's Day.",
            "fa": "توی خانواده ما، روز سال نو همیشه شام بزرگ داریم.",
            "level": "B1"
          },
          {
            "en": "I'm going to visit my hometown for the holidays. I can't wait to see my family.",
            "fa": "برای تعطیلات می‌رم شهر خودم. بی‌صبرانه منتظرم خانواده‌م رو ببینم.",
            "level": "B1"
          },
          {
            "en": "We have a tradition of lighting fireworks at midnight.",
            "fa": "ما یه سنت داریم که نیمه‌شب آتش‌بازی روشن می‌کنیم.",
            "level": "B2"
          },
          {
            "en": "How do you usually spend Nowruz? I've heard it's a wonderful celebration.",
            "fa": "معمولاً نوروز رو چطور می‌گذرونید؟ شنیدم جشن فوق‌العاده‌ای است.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, we celebrate it with trees and gifts.",
            "fa": "بله، با درخت کریسمس و هدیه جشن می‌گیریم.",
            "level": "A1"
          },
          {
            "en": "I'm going to a friend's party. We'll probably stay up until midnight.",
            "fa": "می‌رم به مهمونی یه دوست. احتمالاً تا نیمه‌شب بیدار می‌مونیم.",
            "level": "A2"
          },
          {
            "en": "That sounds lovely. We usually have a family gathering and play games.",
            "fa": "خیلی قشنگ به نظر میاد. ما معمولاً دورهمی خانوادگی داریم و بازی می‌کنیم.",
            "level": "B1"
          },
          {
            "en": "That's wonderful! I hope you have a great time.",
            "fa": "خیلی عالیه! امیدوارم اوقات خوبی داشته باشی.",
            "level": "B1"
          },
          {
            "en": "That sounds beautiful. We do the same thing here.",
            "fa": "زیبا به نظر میاد. ما هم اینجا همین کار رو می‌کنیم.",
            "level": "B2"
          },
          {
            "en": "We set up a Haft-Seen table with seven symbolic items and visit relatives.",
            "fa": "ما یه سفره هفت‌سین با هفت نماد می‌چینیم و به دیدار اقوام می‌رویم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Pets and Animals",
    "scenarios": [
      {
        "scenario": "Talking about pets",
        "context": "Two people discuss whether they have pets or their experiences with animals.",
        "speakerA": [
          {
            "en": "Do you have any pets?",
            "fa": "حیوان خانگی داری؟",
            "level": "A1"
          },
          {
            "en": "What kind of animal is your pet?",
            "fa": "حیوانتون چه نوع حیوانی هست؟",
            "level": "A1"
          },
          {
            "en": "I have a golden retriever named Max. He's very friendly and loves to play.",
            "fa": "یه سگ گلدن رتریور به نام مکس دارم. خیلی مهربونه و عاشق بازیه.",
            "level": "A2"
          },
          {
            "en": "My cat is quite lazy. She sleeps all day and only wakes up for food.",
            "fa": "گربه‌ام خیلی تنبله. تمام روز می‌خوابه و فقط برای غذا بیدار می‌شه.",
            "level": "B1"
          },
          {
            "en": "Adopting a pet is a big responsibility. You need to care for them properly.",
            "fa": "پذیرش یه حیوان خانگی مسئولیت بزرگیه. باید درست ازشون مراقبت کنی.",
            "level": "B2"
          },
          {
            "en": "I'm thinking of getting a parrot. I've heard they're very intelligent birds.",
            "fa": "به گرفتن یه طوطی فکر می‌کنم. شنیدم پرنده‌های خیلی باهوشی هستن.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I have a cat.",
            "fa": "بله، یه گربه دارم.",
            "level": "A1"
          },
          {
            "en": "I have a dog. He's a small poodle.",
            "fa": "یه سگ دارم. یه پودل کوچیکه.",
            "level": "A1"
          },
          {
            "en": "That's so cute! I have a Labrador myself. She's called Luna.",
            "fa": "خیلی نازه! من خودم یه لابرادور دارم. اسمش لوناست.",
            "level": "A2"
          },
          {
            "en": "My dog is the opposite. He's full of energy and wants to go out every hour!",
            "fa": "سگ من برعکسه. پر از انرژی هست و هر ساعت می‌خواد بره بیرون!",
            "level": "B1"
          },
          {
            "en": "Absolutely. It's not just about feeding them; you have to walk them and show love.",
            "fa": "کاملاً درسته. فقط به غذا دادن نیست؛ باید ببریشون پیاده‌روی و بهشون محبت کنی.",
            "level": "B2"
          },
          {
            "en": "Parrots are amazing, but they need lots of attention and social interaction.",
            "fa": "طوطی‌ها فوق‌العاده هستن، اما به توجه زیاد و تعامل اجتماعی نیاز دارن.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Learning a Language",
    "scenarios": [
      {
        "scenario": "Asking about language skills and learning methods",
        "context": "People talk about the languages they speak or want to learn.",
        "speakerA": [
          {
            "en": "What languages do you speak?",
            "fa": "به چه زبان‌هایی صحبت می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "I'm learning English. Do you have any tips for improving?",
            "fa": "دارم انگلیسی یاد می‌گیرم. نکته‌ای برای پیشرفت داری؟",
            "level": "A2"
          },
          {
            "en": "I've been studying Spanish for two years. I can hold a conversation now.",
            "fa": "دو سال هست که اسپانیایی می‌خونم. الان می‌تونم مکالمه کنم.",
            "level": "B1"
          },
          {
            "en": "The best way to learn a language is by practicing with native speakers.",
            "fa": "بهترین راه یادگیری یه زبان، تمرین با افراد بومی است.",
            "level": "B1"
          },
          {
            "en": "I find listening to podcasts and watching films in the target language really helpful.",
            "fa": "به نظر من گوش دادن به پادکست و تماشای فیلم به زبان هدف خیلی مفیده.",
            "level": "B2"
          },
          {
            "en": "I'm a bit intimidated by speaking because I'm afraid of making mistakes.",
            "fa": "یه کم از حرف زدن می‌ترسم چون از اشتباه کردن واهمه دارم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I speak Persian and a little English.",
            "fa": "فارسی و کمی انگلیسی صحبت می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I'd suggest watching movies with subtitles. It helps with listening.",
            "fa": "تماشای فیلم با زیرنویس رو پیشنهاد می‌کنم. به تقویت شنیدار کمک می‌کنه.",
            "level": "A2"
          },
          {
            "en": "That's impressive! I'm trying to learn French, but it's difficult.",
            "fa": "قابل تحسینه! من سعی می‌کنم فرانسوی یاد بگیرم، اما سخته.",
            "level": "B1"
          },
          {
            "en": "I agree. I joined a language exchange group and it really boosted my confidence.",
            "fa": "موافقم. به یه گروه تبادل زبان پیوستم و واقعاً اعتماد به نفسم رو بالا برد.",
            "level": "B1"
          },
          {
            "en": "Thanks for the advice! I'll try those methods too.",
            "fa": "ممنون از راهنماییت! اون روش‌ها رو هم امتحان می‌کنم.",
            "level": "B2"
          },
          {
            "en": "Don't worry about mistakes. Most people are happy to help you learn.",
            "fa": "نگران اشتباهات نباش. اکثر مردم خوشحال هستن که بهت کمک کنن یاد بگیری.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Emergency Situations",
    "scenarios": [
      {
        "scenario": "Reporting or asking for help in an emergency",
        "context": "Lost items, accidents, or urgent medical situations.",
        "speakerA": [
          {
            "en": "Help! I think I'm lost. Can you help me find my hotel?",
            "fa": "کمک! فکر کنم گم شدم. میشه کمکم کنید هتل‌م رو پیدا کنم؟",
            "level": "A2"
          },
          {
            "en": "I need to call an ambulance! My friend is having a heart attack.",
            "fa": "باید آمبولانس بگیرم! دوستم حمله قلبی کرده.",
            "level": "A2"
          },
          {
            "en": "I've lost my passport. What should I do?",
            "fa": "پاسپورتم رو گم کردم. چیکار کنم؟",
            "level": "B1"
          },
          {
            "en": "Is there a police station nearby? I've been robbed.",
            "fa": "نزدیک اینجا کلانتری هست؟ دزدی شده‌ام.",
            "level": "B1"
          },
          {
            "en": "I'm stuck in the elevator! Can you call for help?",
            "fa": "توی آسانسور گیر کردم! میشه کمک بگیرید؟",
            "level": "B1"
          },
          {
            "en": "My car broke down in the middle of the road. I need a tow truck.",
            "fa": "ماشینم وسط جاده خراب شده. به یدک‌کش نیاز دارم.",
            "level": "B1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, don't worry. What's the name of your hotel?",
            "fa": "بله، نگران نباش. اسم هتل‌تون چیه؟",
            "level": "A2"
          },
          {
            "en": "I'll call 911 right now. Stay with him until they arrive.",
            "fa": "همین الان به ۹۱۱ زنگ می‌زنم. تا رسیدنشون کنارش بمون.",
            "level": "A2"
          },
          {
            "en": "You should go to the nearest embassy and report it lost.",
            "fa": "باید به نزدیک‌ترین سفارت بری و گم شدنش رو گزارش بدی.",
            "level": "B1"
          },
          {
            "en": "Yes, there's one on the corner. I can walk you there.",
            "fa": "بله، یکی در گوشه خیابان هست. می‌تونم شما رو ببرم اونجا.",
            "level": "B1"
          },
          {
            "en": "Stay calm. I'll call the building security right away.",
            "fa": "آروم باش. همین الان به نگهبان ساختمان زنگ می‌زنم.",
            "level": "B1"
          },
          {
            "en": "I'll call a towing service for you. Do you have a membership with any company?",
            "fa": "یه سرویس یدک‌کش برات می‌گیرم. با هیچ شرکتی عضویت نداری؟",
            "level": "B1"
          }
        ]
      }
    ]
  },
  {
    "topic": "City Attractions and Sightseeing",
    "scenarios": [
      {
        "scenario": "Asking about places to visit in a city",
        "context": "A tourist or newcomer asks for recommendations.",
        "speakerA": [
          {
            "en": "What should I see in this city?",
            "fa": "توی این شهر چه چیزهایی باید ببینم؟",
            "level": "A1"
          },
          {
            "en": "Are there any historical sites near here?",
            "fa": "نزدیک اینجا مکان تاریخی هست؟",
            "level": "A2"
          },
          {
            "en": "I'd like to visit an art museum. Which one do you recommend?",
            "fa": "می‌خوام از یه موزه هنری دیدن کنم. کدوم رو پیشنهاد می‌کنید؟",
            "level": "B1"
          },
          {
            "en": "Is there a good park or garden to relax in?",
            "fa": "یه پارک یا باغ خوب برای استراحت هست؟",
            "level": "A2"
          },
          {
            "en": "What's the most iconic landmark in your city?",
            "fa": "معروف‌ترین جاذبه شهر شما چیه؟",
            "level": "B1"
          },
          {
            "en": "I've heard about the old bazaar. Is it worth visiting?",
            "fa": "درباره بازار قدیمی شنیدم. ارزش دیدن داره؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "You should definitely visit the main square and the cathedral.",
            "fa": "حتماً باید از میدان اصلی و کلیسای جامع دیدن کنی.",
            "level": "A1"
          },
          {
            "en": "Yes, there's an ancient castle about 2 kilometers from here.",
            "fa": "بله، یه قلعه باستانی حدود ۲ کیلومتر از اینجا هست.",
            "level": "A2"
          },
          {
            "en": "The Modern Art Museum is fantastic. It has works by famous artists.",
            "fa": "موزه هنر مدرن فوق‌العاده‌ست. آثاری از هنرمندان معروف داره.",
            "level": "B1"
          },
          {
            "en": "Central Park is lovely. It's perfect for a walk or a picnic.",
            "fa": "پارک مرکزی قشنگه. برای پیاده‌روی یا پیک‌نیک عالیه.",
            "level": "A2"
          },
          {
            "en": "The Golden Gate Bridge is the most famous spot. You can't miss it.",
            "fa": "پل گلدن گیت معروف‌ترین جای شهره. نباید از دستش بدی.",
            "level": "B1"
          },
          {
            "en": "Absolutely! It's full of history and you can find beautiful handcrafts.",
            "fa": "کاملاً! پر از تاریخ هست و می‌تونی صنایع‌دستی زیبا پیدا کنی.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Schools and Education",
    "scenarios": [
      {
        "scenario": "Talking about studies and courses",
        "context": "Students or friends discuss their classes, majors, or educational experiences.",
        "speakerA": [
          {
            "en": "Are you a student?",
            "fa": "دانشجو هستی؟",
            "level": "A1"
          },
          {
            "en": "What do you study at university?",
            "fa": "توی دانشگاه چی می‌خونی؟",
            "level": "A1"
          },
          {
            "en": "How many classes are you taking this semester?",
            "fa": "این ترم چند تا کلاس داری؟",
            "level": "A2"
          },
          {
            "en": "I'm studying computer science. It's interesting but quite challenging.",
            "fa": "علوم کامپیوتر می‌خونم. جالبه ولی نسبتاً چالش‌برانگیزه.",
            "level": "B1"
          },
          {
            "en": "The final exams are next week. I need to study really hard.",
            "fa": "امتحانات نهایی هفته دیگه‌ست. باید خیلی سخت بخونم.",
            "level": "B1"
          },
          {
            "en": "I'm considering doing a Master's degree abroad next year.",
            "fa": "به گرفتن مدرک کارشناسی ارشد در خارج از کشور سال دیگه فکر می‌کنم.",
            "level": "B2"
          },
          {
            "en": "My professor is excellent. She explains concepts very clearly.",
            "fa": "استادم عالیه. مفاهیم رو خیلی واضح توضیح میده.",
            "level": "B2"
          },
          {
            "en": "I find it hard to focus during online lectures. I prefer in-person classes.",
            "fa": "توی کلاس‌های آنلاین تمرکز برام سخته. کلاس‌های حضوری رو ترجیح می‌دم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I'm a student at the local university.",
            "fa": "بله، دانشجوی دانشگاه محلی هستم.",
            "level": "A1"
          },
          {
            "en": "I'm majoring in economics.",
            "fa": "رشته‌ام اقتصاد هست.",
            "level": "A1"
          },
          {
            "en": "I have four classes this semester. Two are online and two are in-person.",
            "fa": "این ترم چهار کلاس دارم. دو تا آنلاین و دو تا حضوری.",
            "level": "A2"
          },
          {
            "en": "That sounds tough. I'm studying literature, and it's a lot of reading.",
            "fa": "به نظر سخت میاد. من ادبیات می‌خونم، و خیلی مطالعه داره.",
            "level": "B1"
          },
          {
            "en": "Good luck with your exams! I'm sure you'll do great.",
            "fa": "تو امتحاناتت موفق باشی! مطمئنم عالی عمل می‌کنی.",
            "level": "B1"
          },
          {
            "en": "That's a great idea. Have you looked into any universities?",
            "fa": "ایده عالییه. دانشگاه‌هایی رو بررسی کردی؟",
            "level": "B2"
          },
          {
            "en": "You're lucky. My teacher speaks so fast that I can barely take notes.",
            "fa": "خوش‌شانسی. استاد من اونقدر سریع صحبت می‌کنه که به سختی نت برمی‌دارم.",
            "level": "B2"
          },
          {
            "en": "I agree. I miss the interaction with classmates too.",
            "fa": "موافقم. دلم برای تعامل با همکلاسی‌ها هم تنگ شده.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Asking about school or homework",
        "context": "Friends or classmates discuss assignments and schoolwork.",
        "speakerA": [
          {
            "en": "Do you have any homework tonight?",
            "fa": "امشب تکلیف داری؟",
            "level": "A1"
          },
          {
            "en": "Can you help me with this math problem?",
            "fa": "میشه توی این مسئله ریاضی کمکم کنی؟",
            "level": "A2"
          },
          {
            "en": "When is the essay due?",
            "fa": "تاریخ تحویل مقاله کیه؟",
            "level": "A2"
          },
          {
            "en": "I didn't understand the lesson today. Could you explain it to me?",
            "fa": "درس امروز رو متوجه نشدم. میشه برام توضیح بدی؟",
            "level": "B1"
          },
          {
            "en": "The teacher gave us a lot of reading for next week. I'm behind.",
            "fa": "معلم برای هفته دیگه کلی مطالعه بهمون داده. عقب‌ترم.",
            "level": "B1"
          },
          {
            "en": "I need to borrow a textbook. Can I lend yours for a few days?",
            "fa": "باید یه کتاب درسی قرض بگیرم. میشه چند روز کتابت رو قرض بگیرم؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I have some math exercises.",
            "fa": "بله، چند تا تمرین ریاضی دارم.",
            "level": "A1"
          },
          {
            "en": "Sure, let me see where you're stuck.",
            "fa": "حتماً، بذار ببینم کجا گیر کردی.",
            "level": "A2"
          },
          {
            "en": "The deadline is next Friday at 5 PM.",
            "fa": "ددلاین جمعه دیگه ساعت ۵ عصر هست.",
            "level": "A2"
          },
          {
            "en": "I can try. Which part confused you the most?",
            "fa": "می‌تونم امتحان کنم. کدوم بخش بیشتر گیج‌ات کرد؟",
            "level": "B1"
          },
          {
            "en": "Me too. I'm reading the material right now. We can study together.",
            "fa": "منم همینطور. الان دارم مطالب رو می‌خونم. می‌تونیم با هم بخونیم.",
            "level": "B1"
          },
          {
            "en": "Of course. Just make sure to return it by Monday.",
            "fa": "حتماً. فقط مطمئن باش تا دوشنبه پسش بدی.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Money and Expenses",
    "scenarios": [
      {
        "scenario": "Talking about costs, budgets and spending",
        "context": "People discuss prices, saving money, or financial plans.",
        "speakerA": [
          {
            "en": "How much does this cost?",
            "fa": "این چنده؟",
            "level": "A1"
          },
          {
            "en": "Do you have change for a twenty?",
            "fa": "برای ۲۰ دلار پول خرد داری؟",
            "level": "A2"
          },
          {
            "en": "I'm trying to save money. I've cut down on eating out.",
            "fa": "سعی می‌کنم پول پس‌انداز کنم. غذا خوردن بیرون رو کم کردم.",
            "level": "B1"
          },
          {
            "en": "Rent is getting more expensive in this city. It's hard to find affordable housing.",
            "fa": "اجاره‌ها توی این شهر داره گران‌تر می‌شه. پیدا کردن مسکن ارزان سخته.",
            "level": "B1"
          },
          {
            "en": "I think I need to create a monthly budget to manage my expenses better.",
            "fa": "فکر کنم باید یه بودجه ماهانه تنظیم کنم تا هزینه‌هام رو بهتر مدیریت کنم.",
            "level": "B2"
          },
          {
            "en": "Do you usually pay with cash or card?",
            "fa": "معمولاً با پول نقد پرداخت می‌کنی یا کارت؟",
            "level": "A2"
          },
          {
            "en": "I've started investing a small portion of my salary every month.",
            "fa": "هر ماه یه بخش کوچکی از حقوقم رو سرمایه‌گذاری می‌کنم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "It's $15.99, plus tax.",
            "fa": "۱۵ دلار و ۹۹ سنت به اضافه مالیات است.",
            "level": "A1"
          },
          {
            "en": "Sorry, I only have cards. You could ask the cashier for change.",
            "fa": "ببخشید، فقط کارت دارم. می‌تونی از صندوقدار پول خرد بگیری.",
            "level": "A2"
          },
          {
            "en": "That's a good strategy. I've been cooking more at home too.",
            "fa": "استراتژی خوبیه. منم بیشتر خونه آشپزی می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Tell me about it. My rent just went up by 10% this year.",
            "fa": "بگو نداره! اجاره من امسال ۱۰ درصد بالا رفته.",
            "level": "B1"
          },
          {
            "en": "That sounds like a smart plan. I should do the same.",
            "fa": "به نظر برنامه خوبی میاد. منم باید همین کار رو بکنم.",
            "level": "B2"
          },
          {
            "en": "I mostly use my phone to pay. It's much faster and safer.",
            "fa": "بیشتر با گوشی پرداخت می‌کنم. خیلی سریع‌تر و امن‌تره.",
            "level": "A2"
          },
          {
            "en": "That's very forward-thinking. I'm still learning about stocks and bonds.",
            "fa": "خیلی آینده‌نگرانه‌ست. من هنوز دارم درباره سهام و اوراق قرضه یاد می‌گیرم.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Asking for prices and bargaining",
        "context": "In a market or store, asking about price and negotiating.",
        "speakerA": [
          {
            "en": "How much is this shirt?",
            "fa": "این پیراهن چنده؟",
            "level": "A1"
          },
          {
            "en": "Is there any discount on this item?",
            "fa": "برای این کالا تخفیفی هست؟",
            "level": "A2"
          },
          {
            "en": "Can you give me a better price if I buy two?",
            "fa": "اگه دو تا بخرم قیمت بهتری می‌دین؟",
            "level": "B1"
          },
          {
            "en": "That's a bit expensive for me. Is there a cheaper alternative?",
            "fa": "این یه کم برام گرونه. گزینه ارزان‌تری هست؟",
            "level": "B1"
          },
          {
            "en": "Could you lower the price to $30? I'll take it right now.",
            "fa": "میشه قیمت رو به ۳۰ دلار بدید؟ همین الان می‌خرمش.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "It's $25.",
            "fa": "۲۵ دلار است.",
            "level": "A1"
          },
          {
            "en": "Yes, there's a 20% discount this week.",
            "fa": "بله، این هفته ۲۰٪ تخفیف داره.",
            "level": "A2"
          },
          {
            "en": "I can give you 10% off for two items.",
            "fa": "برای دو تا می‌تونم ۱۰٪ تخفیف بدم.",
            "level": "B1"
          },
          {
            "en": "We have a similar one in a different color for $10 less.",
            "fa": "یه نمونه مشابه با رنگ دیگه ۱۰ دلار ارزان‌تر داریم.",
            "level": "B1"
          },
          {
            "en": "Alright, I'll sell it for $35. That's the best I can do.",
            "fa": "باشه، به ۳۵ دلار می‌دم. این بهترین قیمتی هست که می‌تونم بدم.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Books and Reading",
    "scenarios": [
      {
        "scenario": "Discussing reading habits and favorite books",
        "context": "People talk about books they've read or want to read.",
        "speakerA": [
          {
            "en": "Do you like reading books?",
            "fa": "کتاب خواندن رو دوست داری؟",
            "level": "A1"
          },
          {
            "en": "What kind of books do you enjoy?",
            "fa": "چه نوع کتاب‌هایی رو دوست داری؟",
            "level": "A2"
          },
          {
            "en": "I'm currently reading a mystery novel. It's really gripping.",
            "fa": "این روزا یه رمان معمایی می‌خونم. واقعاً جذابه.",
            "level": "B1"
          },
          {
            "en": "I mostly read non-fiction. I love learning about history and science.",
            "fa": "بیشتر کتاب‌های غیرداستانی می‌خونم. عاشق یادگیری تاریخ و علم هستم.",
            "level": "B2"
          },
          {
            "en": "Have you read any books by Khaled Hosseini? He's a brilliant author.",
            "fa": "کتاب‌های خالد حسینی رو خوندی؟ نویسنده فوق‌العاده‌ای هست.",
            "level": "B2"
          },
          {
            "en": "I find reading to be the best way to relax after a long day.",
            "fa": "به نظر من مطالعه بهترین راه برای استراحت بعد از یه روز طولانیه.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I love reading novels.",
            "fa": "بله، عاشق خوندن رمان هستم.",
            "level": "A1"
          },
          {
            "en": "I'm a big fan of science fiction and fantasy.",
            "fa": "من طرفدار پر و پا قرص علمی-تخیلی و فانتزی هستم.",
            "level": "A2"
          },
          {
            "en": "Oh, I love mysteries too! What's it called?",
            "fa": "اوه، منم عاشق معمایی هستم! اسمش چیه؟",
            "level": "B1"
          },
          {
            "en": "That's interesting. I like fiction more because it helps me escape reality.",
            "fa": "جالبه. من داستانی رو بیشتر دوست دارم چون بهم کمک می‌کنه از واقعیت فرار کنم.",
            "level": "B2"
          },
          {
            "en": "Yes, I've read The Kite Runner. It was heartbreaking and beautiful.",
            "fa": "بله، بادبادک‌باز رو خوندم. دل‌شکن و زیبا بود.",
            "level": "B2"
          },
          {
            "en": "I couldn't agree more. Nothing beats a good book and a cup of tea.",
            "fa": "کاملاً موافقم. هیچی به پای یه کتاب خوب و یه فنجون چای نمی‌رسه.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "At a library or bookstore",
        "context": "Looking for a book and asking for recommendations.",
        "speakerA": [
          {
            "en": "Where is the fiction section?",
            "fa": "بخش داستانی کجاست؟",
            "level": "A1"
          },
          {
            "en": "Do you have this book in stock?",
            "fa": "این کتاب رو موجود دارید؟",
            "level": "A2"
          },
          {
            "en": "I'm looking for something by the author J.K. Rowling.",
            "fa": "دنبال چیزی از نویسنده جی.کی. رولینگ می‌گردم.",
            "level": "A2"
          },
          {
            "en": "Can you recommend a good book for young adults?",
            "fa": "یه کتاب خوب برای نوجوانان می‌تونید پیشنهاد بدید؟",
            "level": "B1"
          },
          {
            "en": "Is this book available as an audiobook?",
            "fa": "این کتاب به صورت کتاب صوتی هم موجوده؟",
            "level": "B1"
          },
          {
            "en": "I'd like to borrow this book for two weeks. Is that possible?",
            "fa": "می‌خوام این کتاب رو دو هفته امانت بگیرم. امکان‌پذیره؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "It's on the second floor, to your right.",
            "fa": "طبقه دوم، سمت راست است.",
            "level": "A1"
          },
          {
            "en": "Let me check our system. Yes, we have two copies left.",
            "fa": "بذارید سیستم‌مون رو چک کنم. بله، دو نسخه مونده.",
            "level": "A2"
          },
          {
            "en": "We have several of her novels. Which one are you looking for?",
            "fa": "چندین رمان ازش داریم. کدومش رو می‌خواید؟",
            "level": "A2"
          },
          {
            "en": "I'd recommend 'The Perks of Being a Wallflower' or anything by John Green.",
            "fa": "'مزایای گوشه‌گیر بودن' یا هر چی از جان گرین رو توصیه می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Yes, we have both the paperback and the audiobook version.",
            "fa": "بله، هم نسخه کاغذی و هم کتاب صوتی رو داریم.",
            "level": "B1"
          },
          {
            "en": "Sure, just bring it back before the 20th to avoid a late fee.",
            "fa": "حتماً، فقط قبل از ۲۰ بیاریدش تا جریمه تأخیر نخورید.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Environment and Nature",
    "scenarios": [
      {
        "scenario": "Discussing environmental issues and personal habits",
        "context": "People talk about recycling, pollution, or ways to help the planet.",
        "speakerA": [
          {
            "en": "Do you recycle at home?",
            "fa": "خونه بازیافت می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "The air quality in this city is getting worse. We need more trees.",
            "fa": "کیفیت هوا توی این شهر داره بدتر می‌شه. به درخت‌های بیشتری نیاز داریم.",
            "level": "A2"
          },
          {
            "en": "I always carry a reusable bag to avoid plastic waste.",
            "fa": "همیشه یه کیسه قابل استفاده مجدد با خودم می‌برم تا زباله پلاستیکی تولید نکنم.",
            "level": "B1"
          },
          {
            "en": "Climate change is a serious issue. We all need to do our part.",
            "fa": "تغییرات اقلیمی یه مسئله جدیه. همه‌مون باید سهم خودمون رو انجام بدیم.",
            "level": "B2"
          },
          {
            "en": "I've switched to using public transport to reduce my carbon footprint.",
            "fa": "برای کاهش ردپای کربنم، به استفاده از حمل و نقل عمومی روی آوردم.",
            "level": "B2"
          },
          {
            "en": "Have you heard about the new recycling initiative in our neighborhood?",
            "fa": "درباره طرح جدید بازیافت تو محله‌مون شنیدی؟",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, we separate plastics and paper.",
            "fa": "بله، پلاستیک و کاغذ رو جدا می‌کنیم.",
            "level": "A1"
          },
          {
            "en": "I agree. I think the government should invest more in green spaces.",
            "fa": "موافقم. فکر کنم دولت باید بیشتر در فضاهای سبز سرمایه‌گذاری کنه.",
            "level": "A2"
          },
          {
            "en": "That's great! I'm trying to do the same. Plastic waste is a huge problem.",
            "fa": "عالیه! منم سعی می‌کنم همین کار رو بکنم. زباله پلاستیکی یه مشکل بزرگه.",
            "level": "B1"
          },
          {
            "en": "Definitely. I've started composting food waste in my garden.",
            "fa": "قطعاً. توی باغچه‌م شروع به کمپوست کردن زباله‌های غذایی کردم.",
            "level": "B2"
          },
          {
            "en": "That's admirable. I'm still struggling to give up using single-use plastics.",
            "fa": "قابل تحسینه. من هنوز برام سخته که پلاستیک‌های یکبار مصرف رو کنار بذارم.",
            "level": "B2"
          },
          {
            "en": "Yes, they're organizing a neighborhood clean-up day. I'm going to join.",
            "fa": "بله، دارن یه روز نظافت محله ترتیب می‌دن. من می‌خوام شرکت کنم.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Talking about natural beauty and outdoor activities",
        "context": "People discuss parks, hikes, or enjoying nature.",
        "speakerA": [
          {
            "en": "Do you like spending time in nature?",
            "fa": "وقت گذروندن در طبیعت رو دوست داری؟",
            "level": "A1"
          },
          {
            "en": "Where's the nearest hiking trail from here?",
            "fa": "نزدیک‌ترین مسیر پیاده‌روی از اینجا کجاست؟",
            "level": "A2"
          },
          {
            "en": "I love going to the mountains to escape the city noise.",
            "fa": "عاشق رفتن به کوه هستم تا از سر و صدای شهر فرار کنم.",
            "level": "B1"
          },
          {
            "en": "The sunset at the beach yesterday was absolutely stunning.",
            "fa": "غروب دیروز ساحل فوق‌العاده زیبا بود.",
            "level": "B1"
          },
          {
            "en": "I'm planning a camping trip for next month. Do you have any camping gear?",
            "fa": "برای ماه دیگه یه سفر کمپینگ برنامه‌ریزی می‌کنم. تجهیزات کمپینگ داری؟",
            "level": "B2"
          },
          {
            "en": "Birdwatching is a relaxing hobby. You can see so many species in this area.",
            "fa": "پرنده‌نگری یه سرگرمی آرامش‌بخشه. توی این منطقه می‌تونی خیلی گونه‌های مختلف ببینی.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I love going for walks in the park.",
            "fa": "بله، عاشق قدم زدن در پارک هستم.",
            "level": "A1"
          },
          {
            "en": "There's a nice trail about 3 kilometers from here.",
            "fa": "یه مسیر خوب حدود ۳ کیلومتر از اینجا هست.",
            "level": "A2"
          },
          {
            "en": "I understand. I feel the same way about the forest near my house.",
            "fa": "می‌دونم. منم همین احساس رو نسبت به جنگل نزدیک خونه‌م دارم.",
            "level": "B1"
          },
          {
            "en": "I wish I could have seen it! The beach is my favorite place to unwind.",
            "fa": "کاش می‌تونستم ببینمش! ساحل جای مورد علاقه من برای آرامشه.",
            "level": "B1"
          },
          {
            "en": "Camping sounds exciting! I have a tent and sleeping bags you can borrow.",
            "fa": "کمپینگ هیجان‌انگیز به نظر میاد! من چادر و کیسه خواب دارم که می‌تونی قرض بگیری.",
            "level": "B2"
          },
          {
            "en": "That's so interesting. I'm more into photography. I like capturing wildlife moments.",
            "fa": "خیلی جالبه. من بیشتر به عکاسی علاقه دارم. دوست دارم لحظات حیات وحش رو ثبت کنم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Cooking and Recipes",
    "scenarios": [
      {
        "scenario": "Talking about food preferences and cooking skills",
        "context": "People discuss what they like to eat and their cooking experience.",
        "speakerA": [
          {
            "en": "Do you like cooking?",
            "fa": "آشپزی رو دوست داری؟",
            "level": "A1"
          },
          {
            "en": "What's your favorite dish to cook?",
            "fa": "بهترین غذایی که دوست داری بپزی چیه؟",
            "level": "A2"
          },
          {
            "en": "I can cook simple things like pasta and omelettes.",
            "fa": "می‌تونم چیزهای ساده مثل پاستا و املت درست کنم.",
            "level": "A2"
          },
          {
            "en": "I'm trying to learn how to cook Persian food. It's a bit complicated but delicious.",
            "fa": "سعی می‌کنم غذای ایرانی پختن رو یاد بگیرم. یه کم پیچیده‌ست ولی خوشمزه‌ست.",
            "level": "B1"
          },
          {
            "en": "I love experimenting with spices. They totally change the flavor of a dish.",
            "fa": "عاشق آزمایش با ادویه‌ها هستم. طعم غذا رو کاملاً تغییر می‌دن.",
            "level": "B2"
          },
          {
            "en": "I've been following a plant-based diet for a few months now. It's been great for my health.",
            "fa": "چند ماهه که رژیم گیاهی گرفتم. برای سلامتی‌م عالی بوده.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I find it very relaxing.",
            "fa": "بله، برام خیلی آرامش‌بخشه.",
            "level": "A1"
          },
          {
            "en": "I love making homemade pizza. It's so much better than takeout.",
            "fa": "عاشق پیتزای خانگی هستم. خیلی بهتر از پیتزای بیرونیه.",
            "level": "A2"
          },
          {
            "en": "That's a good start. I also recommend learning to make soup. It's easy and healthy.",
            "fa": "شروع خوبیه. منم توصیه می‌کنم سوپ درست کردن رو یاد بگیری. راحت و سالمه.",
            "level": "A2"
          },
          {
            "en": "Oh, I love Persian food! I'd love to try some of your dishes someday.",
            "fa": "اوه، عاشق غذای ایرانی هستم! دوست دارم یه روزی غذاهای شما رو امتحان کنم.",
            "level": "B1"
          },
          {
            "en": "I agree. A pinch of cinnamon or cumin can make a huge difference.",
            "fa": "موافقم. یه کم دارچین یا زیره می‌تونه تفاوت خیلی زیادی ایجاد کنه.",
            "level": "B2"
          },
          {
            "en": "That's inspiring. I'm thinking of reducing meat in my diet too.",
            "fa": "الهام‌بخشه. منم به کاهش گوشت در رژیم غذاییم فکر می‌کنم.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Sharing a recipe or asking for cooking advice",
        "context": "Someone asks how to cook a specific dish or requests a recipe.",
        "speakerA": [
          {
            "en": "Could you teach me how to make that cake?",
            "fa": "میشه بهم یاد بدی اون کیک رو چطور درست کنم؟",
            "level": "A2"
          },
          {
            "en": "What's your secret to making this curry so flavorful?",
            "fa": "راز اینکه این کاری رو اینقدر خوش‌طعم می‌کنی چیه؟",
            "level": "B1"
          },
          {
            "en": "Could you write down the recipe for me?",
            "fa": "میشه دستور پخت رو برام بنویسی؟",
            "level": "A2"
          },
          {
            "en": "How long do you need to bake the bread for?",
            "fa": "این نان رو چقدر باید توی فر بذاری؟",
            "level": "B1"
          },
          {
            "en": "I always overcook the rice. Do you have any tips for perfect rice?",
            "fa": "همیشه برنج رو بیش از حد می‌پزم. نکته‌ای برای برنج عالی داری؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Sure! The main ingredients are flour, eggs, and sugar. Let me show you.",
            "fa": "حتماً! مواد اصلی آرد، تخم‌مرغ و شکر هستن. بذارید نشونتون بدم.",
            "level": "A2"
          },
          {
            "en": "I add a bit of coconut milk and fresh herbs at the end.",
            "fa": "تهش یه کم شیر نارگیل و سبزی تازه اضافه می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Of course, I'll send it to you later.",
            "fa": "حتماً، بعداً برات می‌فرستم.",
            "level": "A2"
          },
          {
            "en": "About 30 minutes at 180 degrees Celsius.",
            "fa": "حدود ۳۰ دقیقه در دمای ۱۸۰ درجه سانتی‌گراد.",
            "level": "B1"
          },
          {
            "en": "Try rinsing the rice several times and soaking it before cooking. That helps.",
            "fa": "سعی کن برنج رو چند بار آبکشی کنی و قبل از پخت خیسش کنی. این کمک می‌کنه.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Movies and TV Series",
    "scenarios": [
      {
        "scenario": "Talking about what you're watching",
        "context": "Two friends discuss their favorite shows or movies.",
        "speakerA": [
          {
            "en": "Do you like watching movies?",
            "fa": "فیلم دیدن رو دوست داری؟",
            "level": "A1"
          },
          {
            "en": "What's your favorite TV show right now?",
            "fa": "محبوب‌ترین سریال تلویزیونی تو این روزا چیه؟",
            "level": "A2"
          },
          {
            "en": "I've just started watching a new series on Netflix. It's really addictive.",
            "fa": "تازه یه سریال جدید توی نتفلیکس شروع کردم. واقعاً اعتیادآوره.",
            "level": "B1"
          },
          {
            "en": "I prefer movies over series because they're shorter and more intense.",
            "fa": "فیلم رو به سریال ترجیح می‌دم چون کوتاه‌تر و پرشورتر هستن.",
            "level": "B1"
          },
          {
            "en": "The acting in that film was outstanding. I was really moved by the story.",
            "fa": "بازیگری توی اون فیلم فوق‌العاده بود. داستان واقعاً منو تحت تأثیر قرار داد.",
            "level": "B2"
          },
          {
            "en": "I'm a huge fan of documentaries. They teach you so much about real life.",
            "fa": "من طرفدار پر و پا قرص مستندها هستم. خیلی چیزها درباره زندگی واقعی یاد می‌دن.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I love watching comedies.",
            "fa": "بله، عاشق فیلم‌های کمدی هستم.",
            "level": "A1"
          },
          {
            "en": "I'm really into 'Stranger Things' at the moment. I can't stop watching!",
            "fa": "این روزا خیلی به 'چیزهای عجیب' علاقه دارم. نمی‌تونم دست از تماشا بکشم!",
            "level": "A2"
          },
          {
            "en": "Oh, what's it about? I'm looking for something new to watch.",
            "fa": "اوه، درباره‌ش چیه؟ دنبال یه چیز جدید برای تماشا می‌گردم.",
            "level": "B1"
          },
          {
            "en": "I get that, but I like series because you can connect more with the characters.",
            "fa": "متوجه‌ام، اما من سریال رو دوست دارم چون بیشتر با شخصیت‌ها ارتباط برقرار می‌کنی.",
            "level": "B1"
          },
          {
            "en": "I heard about it. I should give it a try this weekend.",
            "fa": "درباره‌ش شنیدم. باید این آخر هفته امتحانش کنم.",
            "level": "B2"
          },
          {
            "en": "I agree! I recently watched one about the ocean and it blew my mind.",
            "fa": "موافقم! اخیراً یه مستند درباره اقیانوس دیدم که حسابی شگفت‌زده‌ام کرد.",
            "level": "C1"
          }
        ]
      },
      {
        "scenario": "Discussing spoilers and cinema plans",
        "context": "Talking about going to the cinema or avoiding spoilers.",
        "speakerA": [
          {
            "en": "Would you like to go to the cinema this weekend?",
            "fa": "مایلید این آخر هفته بریم سینما؟",
            "level": "A1"
          },
          {
            "en": "What's playing at the cinema near us?",
            "fa": "نزدیک ما توی سینما چی پخش می‌شه؟",
            "level": "A2"
          },
          {
            "en": "I haven't seen the new Marvel movie yet. Please don't spoil it for me.",
            "fa": "هنوز فیلم جدید مارول رو ندیدم. لطفاً اسپویلش نکن.",
            "level": "B1"
          },
          {
            "en": "The tickets are sold out for the evening show. Let's book for tomorrow.",
            "fa": "بلیط‌های سانس عصر تموم شده. بیا برای فردا رزرو کنیم.",
            "level": "B1"
          },
          {
            "en": "I was disappointed by the ending. It felt rushed and unsatisfying.",
            "fa": "از پایانش ناامید شدم. احساس می‌کردم عجله‌ای و ناراضی‌کننده بود.",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Sure! I'd love to.",
            "fa": "حتماً! خیلی دوست دارم.",
            "level": "A1"
          },
          {
            "en": "I think there's a new action movie and a romance film.",
            "fa": "فکر کنم یه فیلم اکشن جدید و یه فیلم عاشقانه هست.",
            "level": "A2"
          },
          {
            "en": "Don't worry, I won't say a word! I hated it when people spoil movies for me.",
            "fa": "نگران نباش، یه کلمه هم نمی‌گم! از وقتی مردم فیلم‌ها رو برام اسپویل می‌کنن متنفرم.",
            "level": "B1"
          },
          {
            "en": "Good idea. I'll buy the tickets online to be sure.",
            "fa": "ایده خوبیه. بلیط‌ها رو آنلاین می‌خرم تا مطمئن بشم.",
            "level": "B1"
          },
          {
            "en": "I felt the same way. The director could have done so much more with it.",
            "fa": "منم همین احساس رو داشتم. کارگردان می‌تونست خیلی بیشتر از این کار کنه.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Music",
    "scenarios": [
      {
        "scenario": "Sharing music preferences",
        "context": "People talk about genres, artists, and concerts.",
        "speakerA": [
          {
            "en": "What kind of music do you like?",
            "fa": "چه نوع موسیقی‌ای دوست داری؟",
            "level": "A1"
          },
          {
            "en": "Do you play any musical instruments?",
            "fa": "آلت موسیقی‌ای می‌نوازی؟",
            "level": "A2"
          },
          {
            "en": "I'm really into pop and R&B. I love listening to it while driving.",
            "fa": "واقعاً به پاپ و آر اند بی علاقه‌ام. موقع رانندگی گوش دادن بهش رو دوست دارم.",
            "level": "B1"
          },
          {
            "en": "I used to play the guitar, but I haven't practiced in years.",
            "fa": "قبلاً گیتار می‌زدم، اما سال‌هاست تمرین نکردم.",
            "level": "B1"
          },
          {
            "en": "I've been listening to classical music lately. It helps me concentrate while working.",
            "fa": "این روزا به موسیقی کلاسیک گوش می‌دم. بهم کمک می‌کنه حین کار تمرکز کنم.",
            "level": "B2"
          },
          {
            "en": "I'm planning to attend a music festival next month. The lineup looks amazing!",
            "fa": "برای ماه دیگه برنامه دارم برم یه جشنواره موسیقی. ترکیب هنرمندان عالی به نظر میاد!",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I like rock and indie music.",
            "fa": "موسیقی راک و ایندی رو دوست دارم.",
            "level": "A1"
          },
          {
            "en": "I play the piano, but just for fun.",
            "fa": "پیانو می‌زنم، اما فقط برای تفریح.",
            "level": "A2"
          },
          {
            "en": "That's cool! I prefer rock music myself. It has so much energy.",
            "fa": "خوبه! خودم راک رو ترجیح می‌دم. انرژی خیلی زیادی داره.",
            "level": "B1"
          },
          {
            "en": "You should pick it up again! There are great online tutorials these days.",
            "fa": "باید دوباره شروع کنی! این روزا آموزش‌های آنلاین عالی هستن.",
            "level": "B1"
          },
          {
            "en": "That's interesting. I find it a bit boring, but I can see why it works for you.",
            "fa": "جالبه. من یه کم کسل‌کننده می‌دونم، اما می‌تونم بفهمم چرا برات مفیده.",
            "level": "B2"
          },
          {
            "en": "That sounds incredible! I'd love to go but I have work commitments.",
            "fa": "فوق‌العاده به نظر میاد! دوست دارم برم اما تعهدات کاری دارم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Banking and Financial Services",
    "scenarios": [
      {
        "scenario": "At the bank - opening an account or asking about services",
        "context": "A person visits the bank to do some financial business.",
        "speakerA": [
          {
            "en": "I'd like to open a new bank account.",
            "fa": "می‌خوام یه حساب بانکی جدید باز کنم.",
            "level": "A2"
          },
          {
            "en": "What documents do I need to open an account?",
            "fa": "برای افتتاح حساب به چه مدارکی نیاز دارم؟",
            "level": "A2"
          },
          {
            "en": "Can I transfer money to an international account from here?",
            "fa": "می‌تونم از اینجا به یه حساب بین‌المللی پول انتقال بدم؟",
            "level": "B1"
          },
          {
            "en": "What are the fees for a savings account?",
            "fa": "هزینه‌های حساب پس‌انداز چقدر است؟",
            "level": "B1"
          },
          {
            "en": "I'd like to withdraw some cash from my account, please.",
            "fa": "می‌خوام از حسابم پول نقد برداشت کنم، لطفاً.",
            "level": "A2"
          },
          {
            "en": "Could you please help me update my contact details? I've changed my address.",
            "fa": "میشه لطفاً کمک کنید اطلاعات تماسم رو به‌روز کنم؟ آدرسم عوض شده.",
            "level": "B2"
          },
          {
            "en": "I've noticed an unauthorized transaction on my account. I need to report it.",
            "fa": "یه تراکنش غیرمجاز توی حسابم دیدم. باید گزارشش کنم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Of course. Please fill out this application form.",
            "fa": "حتماً. لطفاً این فرم درخواست رو پر کنید.",
            "level": "A2"
          },
          {
            "en": "You'll need a valid ID, proof of address, and a passport photo.",
            "fa": "به کارت شناسایی معتبر، مدرک آدرس و یه عکس پاسپورتی نیاز دارید.",
            "level": "A2"
          },
          {
            "en": "Yes, but there might be some charges. Let me explain the exchange rates.",
            "fa": "بله، اما ممکنه کارمزد داشته باشه. بذارید نرخ ارز رو توضیح بدم.",
            "level": "B1"
          },
          {
            "en": "There are no monthly fees if you maintain a minimum balance.",
            "fa": "اگه حداقل موجودی رو نگه دارید، هزینه ماهیانه نداره.",
            "level": "B1"
          },
          {
            "en": "How much would you like to withdraw?",
            "fa": "چقدر می‌خواید برداشت کنید؟",
            "level": "A2"
          },
          {
            "en": "Sure, I'll update that in our system. It'll take just a moment.",
            "fa": "حتماً، اون رو توی سیستم به‌روز می‌کنم. یه لحظه بیشتر طول نمی‌کشه.",
            "level": "B2"
          },
          {
            "en": "I'm sorry to hear that. I'll block your card right now and initiate an investigation.",
            "fa": "از شنیدن این موضوع متأسفم. همون الان کارتتون رو مسدود و تحقیقات رو شروع می‌کنم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Post Office and Mail",
    "scenarios": [
      {
        "scenario": "Sending a letter or package",
        "context": "At the post office, sending items and asking about postal services.",
        "speakerA": [
          {
            "en": "I'd like to send this letter to the UK. How much will it cost?",
            "fa": "می‌خوام این نامه رو به انگلستان بفرستم. چقدر می‌شه؟",
            "level": "A1"
          },
          {
            "en": "Do you have shipping boxes for sale?",
            "fa": "جعبه‌های حمل و نقل برای فروش دارید؟",
            "level": "A2"
          },
          {
            "en": "I need to send this package by express mail. It's urgent.",
            "fa": "باید این بسته رو با پست سریع بفرستم. اضطراریه.",
            "level": "B1"
          },
          {
            "en": "Can I track the parcel online once it's sent?",
            "fa": "بعد از ارسال می‌تونم بسته رو آنلاین رهگیری کنم؟",
            "level": "B1"
          },
          {
            "en": "How many stamps do I need for a postcard to the US?",
            "fa": "برای کارت‌پستال به آمریکا چند تمبر نیازه؟",
            "level": "A2"
          },
          {
            "en": "I'm sending some documents. Do I need to register them?",
            "fa": "دارم چندتا مدرک می‌فرستم. باید ثبت‌شده (سفارشی) بفرستمشون؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "By standard airmail, it's $5. By sea, it's cheaper but takes longer.",
            "fa": "با پست هوایی معمولی ۵ دلار است. با دریایی ارزان‌تره ولی زمان بیشتری می‌بره.",
            "level": "A1"
          },
          {
            "en": "Yes, we have small, medium, and large boxes.",
            "fa": "بله، جعبه کوچک، متوسط و بزرگ داریم.",
            "level": "A2"
          },
          {
            "en": "This package is quite heavy. Express shipping will cost more.",
            "fa": "این بسته نسبتاً سنگینه. حمل سریع هزینه بیشتری داره.",
            "level": "B1"
          },
          {
            "en": "Yes, you'll receive a tracking number that you can use on our website.",
            "fa": "بله، یه شماره رهگیری دریافت می‌کنید که می‌تونید توی وب‌سایت ما ازش استفاده کنید.",
            "level": "B1"
          },
          {
            "en": "You'll need two international stamps, which are $1.50 each.",
            "fa": "به دو تا تمبر بین‌المللی نیاز دارید که هر کدوم ۱٫۵۰ دلار هست.",
            "level": "A2"
          },
          {
            "en": "I strongly recommend registered mail for important documents. It's safer.",
            "fa": "به شدت برای مدارک مهم پست سفارشی رو توصیه می‌کنم. امن‌تره.",
            "level": "B2"
          }
        ]
      },
      {
        "scenario": "Receiving or picking up a package",
        "context": "Someone has received a package or goes to collect it.",
        "speakerA": [
          {
            "en": "Has my package arrived yet?",
            "fa": "بسته من هنوز نرسیده؟",
            "level": "A1"
          },
          {
            "en": "I got a notification that my delivery is at the post office. Can I pick it up?",
            "fa": "یه اعلان گرفتم که بسته‌ام توی اداره پسته. می‌تونم بردارمش؟",
            "level": "A2"
          },
          {
            "en": "What time does the post office open?",
            "fa": "اداره پست چه ساعتی باز می‌شه؟",
            "level": "A2"
          },
          {
            "en": "I missed the delivery. How can I reschedule?",
            "fa": "تحویل رو از دست دادم. چطور می‌تونم دوباره تنظیمش کنم؟",
            "level": "B1"
          },
          {
            "en": "The package was delivered to the wrong address. What should I do?",
            "fa": "بسته به آدرس اشتباه تحویل داده شده. چیکار کنم؟",
            "level": "B2"
          }
        ],
        "speakerB": [
          {
            "en": "Let me check the system. I think it arrived yesterday.",
            "fa": "بذارید سیستم رو چک کنم. فکر کنم دیروز رسیده.",
            "level": "A1"
          },
          {
            "en": "Yes, you'll need to bring your ID and the collection notice.",
            "fa": "بله، باید کارت شناسایی و اعلان دریافت رو بیارید.",
            "level": "A2"
          },
          {
            "en": "We open at 8:30 AM and close at 5 PM on weekdays.",
            "fa": "روزهای کاری ساعت ۸:۳۰ صبح باز و ۵ عصر تعطیل می‌شیم.",
            "level": "A2"
          },
          {
            "en": "You can call the courier company and ask for a redelivery.",
            "fa": "می‌تونید به شرکت پیک زنگ بزنید و درخواست تحویل مجدد بدید.",
            "level": "B1"
          },
          {
            "en": "I'm sorry about that. We'll launch an investigation and try to locate it.",
            "fa": "از این موضوع متأسفم. ما تحقیقات رو شروع می‌کنیم و سعی می‌کنیم پیداش کنیم.",
            "level": "B2"
          }
        ]
      }
    ]
  },
  {
    "topic": "Neighbors and Community",
    "scenarios": [
      {
        "scenario": "Talking about neighbors and their habits",
        "context": "People discuss their neighbors and experiences in the neighborhood.",
        "speakerA": [
          {
            "en": "Do you know your neighbors well?",
            "fa": "همسایه‌هات رو خوب می‌شناسی؟",
            "level": "A1"
          },
          {
            "en": "I have a really helpful neighbor. She often waters my plants when I'm away.",
            "fa": "یه همسایه خیلی کمک‌کننده دارم. وقتی نیستم، گاهی به گل‌هام آب میده.",
            "level": "A2"
          },
          {
            "en": "The new neighbors are a bit noisy. They play loud music every night.",
            "fa": "همسایه‌های جدید یه کم سروصدا می‌کنن. هر شب موسیقی بلند می‌ذارن.",
            "level": "B1"
          },
          {
            "en": "I'm lucky because my neighbors are very friendly and we look out for each other.",
            "fa": "خوش‌شانسم چون همسایه‌هام خیلی خوش‌برخورد هستن و مواظب هم هستیم.",
            "level": "B1"
          },
          {
            "en": "We've organized a neighborhood watch to improve security in our area.",
            "fa": "ما یه گشت محله‌ای برای بهبود امنیت منطقه سازماندهی کردیم.",
            "level": "B2"
          },
          {
            "en": "I want to build a better relationship with my neighbors. Any suggestions?",
            "fa": "می‌خوام رابطه بهتری با همسایه‌هام برقرار کنم. پیشنهادی داری؟",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "Not really. We just say hello.",
            "fa": "نه زیاد. فقط سلام و احوالپرسی می‌کنیم.",
            "level": "A1"
          },
          {
            "en": "That's nice. I wish my neighbors were that kind.",
            "fa": "خوبه. کاش همسایه‌هام اونقدر مهربون بودن.",
            "level": "A2"
          },
          {
            "en": "That sounds annoying. Have you talked to them about it?",
            "fa": "آزاردهنده به نظر میاد. باهاشون در این باره صحبت کردی؟",
            "level": "B1"
          },
          {
            "en": "That's really nice. It feels safer when you know you can count on them.",
            "fa": "واقعاً خوبه. وقتی می‌دونی می‌تونی رویشون حساب کنی، احساس امنیت بیشتری داری.",
            "level": "B1"
          },
          {
            "en": "That's a great initiative. I wish my neighborhood would do something like that.",
            "fa": "ابتکار فوق‌العاده‌ایست. کاش محله منم یه همچین کاری می‌کرد.",
            "level": "B2"
          },
          {
            "en": "Why not start a small community event? A potluck or a garage sale could work.",
            "fa": "چرا یه رویداد کوچیک محله‌ای شروع نمی‌کنی؟ یه مهمونی یا حراج حیاط خلوت می‌تونه خوب باشه.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Future Plans and Dreams",
    "scenarios": [
      {
        "scenario": "Talking about aspirations and life goals",
        "context": "Two people share their dreams for the future.",
        "speakerA": [
          {
            "en": "What do you want to do in the future?",
            "fa": "توی آینده می‌خوای چیکار کنی؟",
            "level": "A1"
          },
          {
            "en": "I hope to travel around the world one day.",
            "fa": "امیدوارم یه روزی دور دنیا سفر کنم.",
            "level": "A2"
          },
          {
            "en": "My dream is to start my own business and be my own boss.",
            "fa": "رویای من اینه که کسب‌وکار خودم رو راه بندازم و رئیس خودم باشم.",
            "level": "B1"
          },
          {
            "en": "I'm planning to move to a bigger city next year for better career opportunities.",
            "fa": "برنامه دارم سال دیگه برای فرصت‌های شغلی بهتر به یه شهر بزرگ‌تر نقل مکان کنم.",
            "level": "B1"
          },
          {
            "en": "I've always wanted to learn how to fly a plane. It sounds so freeing.",
            "fa": "همیشه دوست داشتم هواپیما خلبانی کنم. خیلی حس آزادی داره.",
            "level": "B2"
          },
          {
            "en": "In ten years, I see myself living abroad with a family and a stable career.",
            "fa": "ده سال دیگه خودم رو خارج از کشور، با خانواده و یه شغل پایدار می‌بینم.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I want to become a doctor.",
            "fa": "می‌خوام دکتر بشم.",
            "level": "A1"
          },
          {
            "en": "That's a great goal! I'd love to see the mountains in Nepal.",
            "fa": "هدف فوق‌العاده‌ایست! من دوست دارم کوه‌های نپال رو ببینم.",
            "level": "A2"
          },
          {
            "en": "That's brave. I'm not sure I could handle the risk.",
            "fa": "شجاعانه‌ست. مطمئن نیستم بتونم ریسکش رو تحمل کنم.",
            "level": "B1"
          },
          {
            "en": "That sounds like a smart move. What field are you interested in?",
            "fa": "به نظر حرکت عاقلانه‌ای میاد. به چه زمینه‌ای علاقه داری؟",
            "level": "B1"
          },
          {
            "en": "I've always admired that. Maybe you should go for it!",
            "fa": "همیشه به این کار حسادت می‌کردم. شاید باید بری دنبالش!",
            "level": "B2"
          },
          {
            "en": "That's a beautiful vision. I hope you achieve it. I'm more focused on the present myself.",
            "fa": "چشم‌انداز قشنگیه. امیدوارم بهش برسی. من خودم بیشتر روی حال حاضر متمرکزم.",
            "level": "C1"
          }
        ]
      }
    ]
  },
  {
    "topic": "Memories and Past Experiences",
    "scenarios": [
      {
        "scenario": "Sharing childhood memories",
        "context": "People talk about their past and what they remember.",
        "speakerA": [
          {
            "en": "What's your earliest memory?",
            "fa": "قدیمی‌ترین خاطره‌ات چیه؟",
            "level": "A2"
          },
          {
            "en": "I remember my grandmother's garden. It was full of beautiful flowers.",
            "fa": "باغ مادربزرگم رو یادم میاد. پر از گل‌های قشنگ بود.",
            "level": "B1"
          },
          {
            "en": "I used to live by the sea when I was a child. I have wonderful memories of the beach.",
            "fa": "وقتی بچه بودم کنار دریا زندگی می‌کردم. خاطرات فوق‌العاده‌ای از ساحل دارم.",
            "level": "B1"
          },
          {
            "en": "That trip to Paris was unforgettable. It was the best holiday I've ever had.",
            "fa": "اون سفر به پاریس فراموش‌نشدنی بود. بهترین تعطیلاتی بود که تا حالا داشتم.",
            "level": "B2"
          },
          {
            "en": "I can still picture the day I graduated from university. It felt like such an achievement.",
            "fa": "هنوز می‌تونم روز فارغ‌التحصیلی از دانشگاه رو مجسم کنم. حس می‌کردم یه دستاورد بزرگه.",
            "level": "C1"
          }
        ],
        "speakerB": [
          {
            "en": "I think it was my third birthday. I got a red bicycle.",
            "fa": "فکر کنم تولد سه‌سالگی‌م بود. یه دوچرخه قرمز گرفتم.",
            "level": "A2"
          },
          {
            "en": "That sounds lovely. I miss my childhood home too.",
            "fa": "خیلی قشنگ به نظر میاد. منم دلم برای خونه دوران کودکیم تنگ شده.",
            "level": "B1"
          },
          {
            "en": "That must have been magical! I grew up in the city, so I never had that experience.",
            "fa": "حتماً جادویی بوده! من تو شهر بزرگ شدم، پس هیچوقت اون تجربه رو نداشتم.",
            "level": "B1"
          },
          {
            "en": "I've never been to Paris, but I've heard it's romantic and beautiful.",
            "fa": "هیچوقت پاریس نرفتم، اما شنیدم رمانتیک و قشنگه.",
            "level": "B2"
          },
          {
            "en": "I remember that day too. It's a milestone you never forget.",
            "fa": "منم اون روز رو یادم میاد. یه نقطه عطفه که هیچوقت فراموش نمی‌شه.",
            "level": "C1"
          }
        ]
      }
    ]
  }
];

export const THEMATIC_CONVERSATIONS = [
  {
    "topic": "طبیعت (Nature)",
    "scenarios": [
      {
        "scenario": "Discussing a beautiful natural scene",
        "context": "Two people are looking at a beautiful landscape.",
        "speakerA": [
          {
            "en": "Wow, look at the view! It's amazing.",
            "fa": "واو، به این منظره نگاه کن! شگفت‌انگیزه.",
            "level": "A1"
          },
          {
            "en": "The mountains are so beautiful today.",
            "fa": "امروز کوه‌ها خیلی زیبا هستند.",
            "level": "A1"
          },
          {
            "en": "I love the sound of the birds singing.",
            "fa": "صدای آواز پرنده‌ها را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "This reminds me of my trip to the Alps last year.",
            "fa": "این منو به سفرم به آلپ پارسال یاد می‌اندازه.",
            "level": "B1"
          },
          {
            "en": "It's so peaceful here, away from the city noise.",
            "fa": "اینجا خیلی آرومه، دور از سر و صدای شهر.",
            "level": "B1"
          },
          {
            "en": "We should protect these natural wonders for future generations.",
            "fa": "ما باید این عجایب طبیعی رو برای نسل‌های آینده حفظ کنیم.",
            "level": "B2"
          },
          {
            "en": "The biodiversity in this region is remarkable.",
            "fa": "تنوع زیستی در این منطقه قابل توجه است.",
            "level": "C1"
          },
          {
            "en": "I feel a deep connection with nature when I'm surrounded by it.",
            "fa": "وقتی در طبیعت احاطه می‌شوم، احساس ارتباط عمیقی با آن دارم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's really beautiful!",
            "fa": "آره، واقعاً زیباست!",
            "level": "A1"
          },
          {
            "en": "I agree, the colors are so vibrant.",
            "fa": "موافقم، رنگ‌ها خیلی زنده هستند.",
            "level": "A1"
          },
          {
            "en": "Me too. It's so relaxing.",
            "fa": "منم همینطور. خیلی آرامش‌بخشه.",
            "level": "A2"
          },
          {
            "en": "Really? I've always wanted to go there.",
            "fa": "واقعاً؟ همیشه دوست داشتم به آنجا برم.",
            "level": "B1"
          },
          {
            "en": "Absolutely, it's refreshing to get some fresh air.",
            "fa": "دقیقاً، هوای تازه خوردن خیلی با طراوته.",
            "level": "B1"
          },
          {
            "en": "I couldn't agree more. We need to raise awareness.",
            "fa": "کاملاً موافقم. باید آگاهی‌بخشی کنیم.",
            "level": "B2"
          },
          {
            "en": "Indeed. The ecosystems here are fragile.",
            "fa": "واقعاً. اکوسیستم‌های اینجا شکننده هستند.",
            "level": "C1"
          },
          {
            "en": "It's humbling to witness such raw beauty.",
            "fa": "مشاهده چنین زیبایی خام، انسان را متواضع می‌کند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Planning an outdoor activity",
        "context": "Two friends are planning a hike or a walk in nature.",
        "speakerA": [
          {
            "en": "Do you want to go for a walk in the park?",
            "fa": "می‌خوای بریم تو پارک قدم بزنیم؟",
            "level": "A1"
          },
          {
            "en": "Let's go hiking this weekend.",
            "fa": "بیا این آخر هفته بریم کوهنوردی.",
            "level": "A2"
          },
          {
            "en": "We should bring some snacks and water.",
            "fa": "باید یه خوراکی و آب با خودمون ببریم.",
            "level": "A2"
          },
          {
            "en": "I know a great trail with a beautiful waterfall.",
            "fa": "یه مسیر خوب با یه آبشار زیبا می‌شناسم.",
            "level": "B1"
          },
          {
            "en": "It's supposed to be sunny tomorrow, perfect for a picnic.",
            "fa": "فردا هوا آفتابی پیش‌بینی شده، برای پیک‌نیک عالیه.",
            "level": "B1"
          },
          {
            "en": "We should start early to avoid the midday heat.",
            "fa": "باید زود شروع کنیم تا از گرمای ظهر جلوگیری کنیم.",
            "level": "B2"
          },
          {
            "en": "I've prepared a detailed itinerary for our camping trip.",
            "fa": "من یک برنامه دقیق برای سفر کمپینگ‌مان آماده کرده‌ام.",
            "level": "C1"
          },
          {
            "en": "We need to ensure we have all the necessary permits.",
            "fa": "باید مطمئن شویم که همه مجوزهای لازم را داریم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I'd love to.",
            "fa": "آره، خیلی دوست دارم.",
            "level": "A1"
          },
          {
            "en": "That sounds like a great idea.",
            "fa": "به نظر ایده خوبی میاد.",
            "level": "A2"
          },
          {
            "en": "Good point. I'll bring some sandwiches.",
            "fa": "نکته خوبی گفتی. من چند تا ساندویچ می‌آرم.",
            "level": "A2"
          },
          {
            "en": "Really? That sounds amazing!",
            "fa": "واقعاً؟ عالی به نظر میاد!",
            "level": "B1"
          },
          {
            "en": "Perfect, I'll bring a blanket and some fruits.",
            "fa": "عالیه، من یه پتو و چند تا میوه می‌آرم.",
            "level": "B1"
          },
          {
            "en": "Absolutely, we don't want to get sunburned.",
            "fa": "دقیقاً، نمی‌خوایم آفتاب سوخته بشیم.",
            "level": "B2"
          },
          {
            "en": "That's impressive. Can I see it?",
            "fa": "قابل تحسینه. می‌تونم ببینمش؟",
            "level": "C1"
          },
          {
            "en": "I've already taken care of the camping permits.",
            "fa": "من قبلاً مجوزهای کمپینگ رو گرفتم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing environmental issues",
        "context": "People talk about pollution, recycling, and climate change.",
        "speakerA": [
          {
            "en": "We should recycle more.",
            "fa": "ما باید بیشتر بازیافت کنیم.",
            "level": "A1"
          },
          {
            "en": "The air is so polluted today.",
            "fa": "امروز هوا خیلی آلوده است.",
            "level": "A2"
          },
          {
            "en": "I try to use less plastic.",
            "fa": "سعی می‌کنم کمتر از پلاستیک استفاده کنم.",
            "level": "A2"
          },
          {
            "en": "Climate change is a real problem.",
            "fa": "تغییرات اقلیمی یک مشکل واقعی است.",
            "level": "B1"
          },
          {
            "en": "We need more green spaces in cities.",
            "fa": "ما به فضاهای سبز بیشتری در شهرها نیاز داریم.",
            "level": "B1"
          },
          {
            "en": "I've switched to using a reusable water bottle.",
            "fa": "من به استفاده از بطری آب قابل استفاده مجدد روی آوردم.",
            "level": "B2"
          },
          {
            "en": "We need to advocate for stronger environmental policies.",
            "fa": "ما باید از سیاست‌های زیست‌محیطی قوی‌تر حمایت کنیم.",
            "level": "C1"
          },
          {
            "en": "The overexploitation of natural resources is unsustainable.",
            "fa": "بهره‌برداری بیش از حد از منابع طبیعی پایدار نیست.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's important.",
            "fa": "بله، مهم است.",
            "level": "A1"
          },
          {
            "en": "I know, we need to plant more trees.",
            "fa": "می‌دونم، ما به کاشت درخت‌های بیشتری نیاز داریم.",
            "level": "A2"
          },
          {
            "en": "Me too. I use reusable bags.",
            "fa": "منم همینطور. از کیسه‌های قابل استفاده مجدد استفاده می‌کنم.",
            "level": "A2"
          },
          {
            "en": "I agree, we should all do our part.",
            "fa": "موافقم، همه ما باید سهم خودمون رو انجام بدیم.",
            "level": "B1"
          },
          {
            "en": "Absolutely, they help reduce the heat.",
            "fa": "دقیقاً، اون‌ها به کاهش گرما کمک می‌کنند.",
            "level": "B1"
          },
          {
            "en": "That's a great step! I've done the same.",
            "fa": "گام فوق‌العاده‌ایست! منم همین کار رو کردم.",
            "level": "B2"
          },
          {
            "en": "I couldn't agree more. We must demand change.",
            "fa": "کاملاً موافقم. ما باید خواهان تغییر باشیم.",
            "level": "C1"
          },
          {
            "en": "Indeed, we need a shift towards a circular economy.",
            "fa": "واقعاً، ما به تغییر به سمت اقتصاد چرخشی نیاز داریم.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "احساسات (Emotions)",
    "scenarios": [
      {
        "scenario": "Expressing happiness and excitement",
        "context": "One person shares good news and expresses joy.",
        "speakerA": [
          {
            "en": "I'm so happy today!",
            "fa": "امروز خیلی خوشحالم!",
            "level": "A1"
          },
          {
            "en": "I got a promotion at work!",
            "fa": "من در کار ترفیع گرفتم!",
            "level": "A2"
          },
          {
            "en": "I'm really excited about the trip.",
            "fa": "در مورد سفر خیلی هیجان‌زده هستم.",
            "level": "A2"
          },
          {
            "en": "I feel on top of the world right now.",
            "fa": "الان احساس می‌کنم روی اوج دنیا هستم.",
            "level": "B1"
          },
          {
            "en": "It's such a relief to finally have this done.",
            "fa": "اینقدر آرامش‌بخش است که بالاخره این کار تمام شد.",
            "level": "B1"
          },
          {
            "en": "I'm overjoyed by the support I've received.",
            "fa": "از حمایتی که دریافت کرده‌ام، بسیار خوشحالم.",
            "level": "B2"
          },
          {
            "en": "I'm absolutely thrilled about the new project.",
            "fa": "در مورد پروژه جدید بسیار هیجان‌زده هستم.",
            "level": "C1"
          },
          {
            "en": "It's a euphoric feeling to see my hard work pay off.",
            "fa": "دیدن نتیجه زحماتم، احساسی اُفراطی دارد.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's great!",
            "fa": "عالیه!",
            "level": "A1"
          },
          {
            "en": "Congratulations! That's wonderful news!",
            "fa": "تبریک! چه خبر فوق‌العاده‌ای!",
            "level": "A2"
          },
          {
            "en": "I'm happy for you! Where are you going?",
            "fa": "به خاطرت خوشحالم! کجا می‌ری؟",
            "level": "A2"
          },
          {
            "en": "You deserve it! I'm so proud of you.",
            "fa": "شایسته‌اش هستی! به تو افتخار می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I bet it feels great to have that weight off your shoulders.",
            "fa": "شرط می‌بندم حس خوبی داره که اون بار از روی دوشت برداشته شده.",
            "level": "B1"
          },
          {
            "en": "That's heartwarming to hear. You deserve it.",
            "fa": "شنیدنش دلگرم‌کننده است. شایسته‌اش هستی.",
            "level": "B2"
          },
          {
            "en": "Your enthusiasm is infectious! I'm really happy for you.",
            "fa": "اشتیاق شما مسری است! واقعاً به خاطر شما خوشحالم.",
            "level": "C1"
          },
          {
            "en": "Such moments of triumph are truly rewarding.",
            "fa": "چنین لحظات پیروزی واقعاً پاداش‌دهنده است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Expressing sadness and disappointment",
        "context": "Someone shares bad news or a difficult situation.",
        "speakerA": [
          {
            "en": "I'm feeling sad today.",
            "fa": "امروز احساس ناراحتی می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I didn't get the job.",
            "fa": "من اون شغل رو به دست نیاوردم.",
            "level": "A2"
          },
          {
            "en": "I lost my wallet. I'm so upset.",
            "fa": "کیف پولم رو گم کردم. خیلی ناراحتم.",
            "level": "A2"
          },
          {
            "en": "I'm really disappointed with the result.",
            "fa": "از نتیجه واقعاً ناامید هستم.",
            "level": "B1"
          },
          {
            "en": "It's been a tough week, to be honest.",
            "fa": "راستش، هفته سختی بود.",
            "level": "B1"
          },
          {
            "en": "I feel a bit discouraged about the whole situation.",
            "fa": "در مورد کل وضعیت کمی دلسرد هستم.",
            "level": "B2"
          },
          {
            "en": "I'm utterly devastated by the news.",
            "fa": "از این خبر به شدت ناراحت هستم.",
            "level": "C1"
          },
          {
            "en": "It's a melancholic day, and I'm struggling to find solace.",
            "fa": "روز غم‌انگیزی است و برای یافتن آرامش تقلا می‌کنم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Oh no, what happened?",
            "fa": "اوه نه، چی شد؟",
            "level": "A1"
          },
          {
            "en": "I'm sorry to hear that. Don't give up.",
            "fa": "از شنیدن این خبر متاسفم. ناامید نشو.",
            "level": "A2"
          },
          {
            "en": "That's terrible. Can I help you look for it?",
            "fa": "این وحشتناکه. می‌تونم کمک کنم پیداش کنی؟",
            "level": "A2"
          },
          {
            "en": "I understand how you feel. It happens to everyone.",
            "fa": "متوجه احساس تو می‌شوم. برای همه پیش می‌آید.",
            "level": "B1"
          },
          {
            "en": "If you need to talk, I'm here for you.",
            "fa": "اگه نیاز به صحبت داری، من اینجام.",
            "level": "B1"
          },
          {
            "en": "That's understandable. It's okay to feel that way.",
            "fa": "قابل درک است. اشکالی نداره که اینطور احساس کنی.",
            "level": "B2"
          },
          {
            "en": "That's very difficult to hear. Please take care of yourself.",
            "fa": "شنیدنش خیلی سخته. لطفاً مراقب خودت باش.",
            "level": "C1"
          },
          {
            "en": "It's a profound sadness, but I hope you find strength.",
            "fa": "غم عمیقی است، اما امیدوارم قدرت پیدا کنی.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Expressing anger and frustration",
        "context": "Someone is upset about a situation or a person.",
        "speakerA": [
          {
            "en": "I'm so angry!",
            "fa": "خیلی عصبانی هستم!",
            "level": "A1"
          },
          {
            "en": "My phone isn't working again.",
            "fa": "گوشی من دوباره کار نمی‌کنه.",
            "level": "A2"
          },
          {
            "en": "I can't believe he said that to me.",
            "fa": "باورم نمی‌شه اون حرف رو به من زد.",
            "level": "A2"
          },
          {
            "en": "It's really frustrating when people don't listen.",
            "fa": "وقتی مردم گوش نمی‌دهند واقعاً آزاردهنده است.",
            "level": "B1"
          },
          {
            "en": "I'm furious about the way I was treated.",
            "fa": "از طرز برخوردی که با من شد، خیلی عصبانی هستم.",
            "level": "B1"
          },
          {
            "en": "This situation is driving me crazy.",
            "fa": "این وضعیت داره دیوونم می‌کنه.",
            "level": "B2"
          },
          {
            "en": "I'm utterly exasperated with the lack of progress.",
            "fa": "از عدم پیشرفت به شدت عصبانی و خسته شده‌ام.",
            "level": "C1"
          },
          {
            "en": "My patience has worn thin, and I'm on the verge of losing it.",
            "fa": "صبرم لبریز شده و در آستانه از دست دادن آن هستم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Calm down. Take a deep breath.",
            "fa": "آروم باش. یه نفس عمیق بکش.",
            "level": "A1"
          },
          {
            "en": "That's so annoying!",
            "fa": "این خیلی آزاردهنده است!",
            "level": "A2"
          },
          {
            "en": "I understand why you're upset.",
            "fa": "می‌دونم چرا ناراحتی.",
            "level": "A2"
          },
          {
            "en": "I know, it can be very irritating.",
            "fa": "می‌دونم، می‌تونه خیلی آزاردهنده باشه.",
            "level": "B1"
          },
          {
            "en": "You have every right to be angry.",
            "fa": "تو کاملاً حق داری عصبانی باشی.",
            "level": "B1"
          },
          {
            "en": "Try to look at it from a different perspective.",
            "fa": "سعی کن از یه زاویه دیگه بهش نگاه کنی.",
            "level": "B2"
          },
          {
            "en": "This must be incredibly difficult for you.",
            "fa": "این باید برای شما فوق‌العاده سخت باشد.",
            "level": "C1"
          },
          {
            "en": "I understand your frustration, but losing control won't help.",
            "fa": "سرخوردگی شما را درک می‌کنم، اما از دست دادن کنترل کمکی نمی‌کند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Expressing fear and anxiety",
        "context": "Someone is scared or worried about something.",
        "speakerA": [
          {
            "en": "I'm scared of the dark.",
            "fa": "از تاریکی می‌ترسم.",
            "level": "A1"
          },
          {
            "en": "I have a big exam tomorrow. I'm so nervous.",
            "fa": "فردا امتحان بزرگی دارم. خیلی عصبی هستم.",
            "level": "A2"
          },
          {
            "en": "I'm worried about my friend. She's sick.",
            "fa": "نگران دوستم هستم. مریض است.",
            "level": "A2"
          },
          {
            "en": "I'm anxious about the presentation next week.",
            "fa": "در مورد ارائه هفته آینده مضطرب هستم.",
            "level": "B1"
          },
          {
            "en": "I have a fear of heights. It's quite limiting.",
            "fa": "از ارتفاع می‌ترسم. خیلی محدودکننده است.",
            "level": "B1"
          },
          {
            "en": "The uncertainty of the future makes me uneasy.",
            "fa": "عدم قطعیت آینده باعث نگرانی من می‌شود.",
            "level": "B2"
          },
          {
            "en": "I'm terrified of what might happen next.",
            "fa": "از اتفاقی که ممکنه بعد بیافتد، وحشت دارم.",
            "level": "C1"
          },
          {
            "en": "An overwhelming sense of dread has consumed me.",
            "fa": "احساس وحشت فراگیری مرا فرا گرفته است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Don't be afraid.",
            "fa": "نترس.",
            "level": "A1"
          },
          {
            "en": "You'll do great. Just relax.",
            "fa": "عالی عمل می‌کنی. فقط آروم باش.",
            "level": "A2"
          },
          {
            "en": "I hope she gets better soon.",
            "fa": "امیدوارم زود خوب بشه.",
            "level": "A2"
          },
          {
            "en": "Just take a deep breath and prepare well.",
            "fa": "فقط یه نفس عمیق بکش و خوب آماده شو.",
            "level": "B1"
          },
          {
            "en": "That's a common fear. There are ways to manage it.",
            "fa": "این یک ترس رایجه. راه‌هایی برای مدیریتش وجود داره.",
            "level": "B1"
          },
          {
            "en": "I know, it can be a lot to handle.",
            "fa": "می‌دونم، می‌تونه زیاد باشه برای مدیریت.",
            "level": "B2"
          },
          {
            "en": "It's important to face your fears gradually.",
            "fa": "مهم است که به تدریج با ترس‌های خود روبرو شوید.",
            "level": "C1"
          },
          {
            "en": "Try mindfulness techniques to ground yourself.",
            "fa": "تکنیک‌های ذهن‌آگاهی را برای ریشه‌یابی خود امتحان کن.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "مذهب و سیاست (Religion and Politics)",
    "scenarios": [
      {
        "scenario": "Discussing religious beliefs",
        "context": "Two people talk about their religion and practices.",
        "speakerA": [
          {
            "en": "What is your religion?",
            "fa": "مذهب شما چیست؟",
            "level": "A1"
          },
          {
            "en": "I am a Christian.",
            "fa": "من مسیحی هستم.",
            "level": "A2"
          },
          {
            "en": "I don't believe in God.",
            "fa": "من به خدا اعتقاد ندارم.",
            "level": "A2"
          },
          {
            "en": "I go to church every Sunday.",
            "fa": "من هر یکشنبه به کلیسا می‌روم.",
            "level": "B1"
          },
          {
            "en": "Religion provides a sense of community for me.",
            "fa": "مذهب برای من حس اجتماع ایجاد می‌کند.",
            "level": "B1"
          },
          {
            "en": "I respect all religions, but I don't follow any.",
            "fa": "به همه مذاهب احترام می‌گذارم، اما از هیچ‌کدام پیروی نمی‌کنم.",
            "level": "B2"
          },
          {
            "en": "My faith is a fundamental part of my identity.",
            "fa": "ایمان من بخش اساسی هویت من است.",
            "level": "C1"
          },
          {
            "en": "I find solace in the philosophical aspects of spirituality.",
            "fa": "من در جنبه‌های فلسفی معنویت آرامش می‌یابم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I am a Muslim.",
            "fa": "من مسلمان هستم.",
            "level": "A1"
          },
          {
            "en": "I don't practice any religion.",
            "fa": "من هیچ مذهبی را انجام نمی‌دهم.",
            "level": "A2"
          },
          {
            "en": "That's interesting.",
            "fa": "جالبه.",
            "level": "A2"
          },
          {
            "en": "I pray five times a day.",
            "fa": "من روزی پنج بار نماز می‌خوانم.",
            "level": "B1"
          },
          {
            "en": "I think religion can be a force for good.",
            "fa": "فکر می‌کنم مذهب می‌تواند نیروی خوبی باشد.",
            "level": "B1"
          },
          {
            "en": "I value the ethical teachings of different faiths.",
            "fa": "من به آموزه‌های اخلاقی ادیان مختلف ارزش می‌دهم.",
            "level": "B2"
          },
          {
            "en": "Spirituality is a personal journey, isn't it?",
            "fa": "معنویت یک سفر شخصی است، اینطور نیست؟",
            "level": "C1"
          },
          {
            "en": "The existential questions that religion tries to answer are universal.",
            "fa": "سوالات وجودی که دین سعی در پاسخ به آنها دارد، جهانی هستند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing politics and elections",
        "context": "People talk about current events and their political views.",
        "speakerA": [
          {
            "en": "Did you vote in the election?",
            "fa": "تو انتخابات رای دادی؟",
            "level": "A1"
          },
          {
            "en": "I support the new president.",
            "fa": "من از رئیس‌جمهور جدید حمایت می‌کنم.",
            "level": "A2"
          },
          {
            "en": "I don't like the current government.",
            "fa": "من دولت فعلی را دوست ندارم.",
            "level": "A2"
          },
          {
            "en": "What do you think about the new policy?",
            "fa": "نظرت در مورد سیاست جدید چیست؟",
            "level": "B1"
          },
          {
            "en": "I think the economy needs more attention.",
            "fa": "فکر می‌کنم اقتصاد نیاز به توجه بیشتری دارد.",
            "level": "B1"
          },
          {
            "en": "The healthcare system is a major issue for me.",
            "fa": "سیستم بهداشت و درمان برای من یک مسئله بزرگ است.",
            "level": "B2"
          },
          {
            "en": "Political polarization is damaging our democracy.",
            "fa": "قطبی‌سازی سیاسی به دموکراسی ما آسیب می‌زند.",
            "level": "C1"
          },
          {
            "en": "The geopolitical implications of this decision are far-reaching.",
            "fa": "پیامدهای ژئوپلیتیکی این تصمیم بسیار گسترده است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I voted.",
            "fa": "بله، رای دادم.",
            "level": "A1"
          },
          {
            "en": "I have a different opinion.",
            "fa": "من نظر متفاوتی دارم.",
            "level": "A2"
          },
          {
            "en": "Why not? What don't you like?",
            "fa": "چرا نه؟ چه چیزی را دوست نداری؟",
            "level": "A2"
          },
          {
            "en": "I think it has some good points.",
            "fa": "فکر می‌کنم نکات خوبی هم دارد.",
            "level": "B1"
          },
          {
            "en": "I agree, but we also need social reforms.",
            "fa": "موافقم، اما ما به اصلاحات اجتماعی هم نیاز داریم.",
            "level": "B1"
          },
          {
            "en": "Education and healthcare are my top priorities.",
            "fa": "آموزش و بهداشت و درمان اولویت‌های اصلی من هستند.",
            "level": "B2"
          },
          {
            "en": "I believe dialogue is essential to bridge the divide.",
            "fa": "من معتقدم گفتگو برای پر کردن شکاف ضروری است.",
            "level": "C1"
          },
          {
            "en": "We must consider the long-term consequences.",
            "fa": "ما باید پیامدهای بلندمدت را در نظر بگیریم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing freedom of speech and tolerance",
        "context": "A conversation about rights and respecting others.",
        "speakerA": [
          {
            "en": "Everyone should be free to speak.",
            "fa": "همه باید آزاد باشند که صحبت کنند.",
            "level": "A2"
          },
          {
            "en": "We need to respect other people's beliefs.",
            "fa": "ما باید به اعتقادات دیگران احترام بگذاریم.",
            "level": "A2"
          },
          {
            "en": "Freedom of speech is a fundamental right.",
            "fa": "آزادی بیان یک حق اساسی است.",
            "level": "B1"
          },
          {
            "en": "Tolerance is key to a peaceful society.",
            "fa": "تحمل کلید یک جامعه صلح‌آمیز است.",
            "level": "B1"
          },
          {
            "en": "We should not impose our beliefs on others.",
            "fa": "ما نباید اعتقادات خود را به دیگران تحمیل کنیم.",
            "level": "B2"
          },
          {
            "en": "I think it's important to listen to different perspectives.",
            "fa": "فکر می‌کنم گوش دادن به دیدگاه‌های مختلف مهم است.",
            "level": "B2"
          },
          {
            "en": "The line between free speech and hate speech must be protected.",
            "fa": "خط بین آزادی بیان و سخنان نفرت‌انگیز باید حفظ شود.",
            "level": "C1"
          },
          {
            "en": "In a pluralistic society, we must navigate diverse worldviews.",
            "fa": "در یک جامعه کثرت‌گرا، ما باید با جهان‌بینی‌های متنوع کنار بیاییم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I agree.",
            "fa": "بله، موافقم.",
            "level": "A2"
          },
          {
            "en": "Absolutely, respect is crucial.",
            "fa": "دقیقاً، احترام ضروری است.",
            "level": "A2"
          },
          {
            "en": "I fully support that.",
            "fa": "من کاملاً از آن حمایت می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Exactly, diversity should be celebrated.",
            "fa": "دقیقاً، تنوع باید جشن گرفته شود.",
            "level": "B1"
          },
          {
            "en": "I couldn't agree more.",
            "fa": "کاملاً موافقم.",
            "level": "B2"
          },
          {
            "en": "It's the only way to truly understand each other.",
            "fa": "این تنها راه برای درک واقعی یکدیگر است.",
            "level": "B2"
          },
          {
            "en": "That's a very nuanced and important point.",
            "fa": "این نکته بسیار دقیق و مهمی است.",
            "level": "C1"
          },
          {
            "en": "It requires ongoing dialogue and critical thinking.",
            "fa": "نیاز به گفتگوی مستمر و تفکر انتقادی دارد.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "خرید (Retail)",
    "scenarios": [
      {
        "scenario": "Buying clothes at a store",
        "context": "A customer is looking for an outfit and needs help.",
        "speakerA": [
          {
            "en": "I want to buy a shirt.",
            "fa": "می‌خواهم یک پیراهن بخرم.",
            "level": "A1"
          },
          {
            "en": "Can I see that jacket, please?",
            "fa": "لطفاً می‌توانم آن کت را ببینم؟",
            "level": "A1"
          },
          {
            "en": "Do you have this dress in blue?",
            "fa": "این لباس را به رنگ آبی دارید؟",
            "level": "A2"
          },
          {
            "en": "This is too expensive for me.",
            "fa": "این برای من خیلی گران است.",
            "level": "A2"
          },
          {
            "en": "Can I try this on? Where is the fitting room?",
            "fa": "می‌توانم این را پرو کنم؟ اتاق پرو کجاست؟",
            "level": "A2"
          },
          {
            "en": "I'm looking for something more casual.",
            "fa": "به دنبال چیزی غیررسمی‌تر هستم.",
            "level": "B1"
          },
          {
            "en": "Do you have this in a larger size?",
            "fa": "این را در سایز بزرگتر دارید؟",
            "level": "B1"
          },
          {
            "en": "I'd like to return this. It doesn't fit.",
            "fa": "می‌خواهم این را پس بدهم. اندازه نیست.",
            "level": "B1"
          },
          {
            "en": "The quality of this material is impressive.",
            "fa": "کیفیت این پارچه قابل توجه است.",
            "level": "B2"
          },
          {
            "en": "I'll take it. Can I pay with my card?",
            "fa": "این را می‌خرم. می‌توانم با کارت پرداخت کنم؟",
            "level": "B2"
          },
          {
            "en": "I'm not entirely satisfied with the stitching.",
            "fa": "من کاملاً از دوخت راضی نیستم.",
            "level": "C1"
          },
          {
            "en": "I'm contemplating a more sustainable fashion choice.",
            "fa": "به انتخاب مد پایدارتر فکر می‌کنم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Sure, we have many colors.",
            "fa": "حتماً، ما رنگ‌های زیادی داریم.",
            "level": "A1"
          },
          {
            "en": "Of course. Here you are.",
            "fa": "حتماً. بفرمایید.",
            "level": "A1"
          },
          {
            "en": "Let me check for you.",
            "fa": "بگذارید برایتان چک کنم.",
            "level": "A2"
          },
          {
            "en": "We have some cheaper options.",
            "fa": "ما گزینه‌های ارزان‌تری داریم.",
            "level": "A2"
          },
          {
            "en": "The fitting rooms are at the back.",
            "fa": "اتاق‌های پرو در پشت فروشگاه هستند.",
            "level": "A2"
          },
          {
            "en": "This section has casual wear.",
            "fa": "این بخش پوشاک غیررسمی دارد.",
            "level": "B1"
          },
          {
            "en": "I'll check the stock in the back.",
            "fa": "موجودی انبار را بررسی می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Do you have the receipt?",
            "fa": "رسید را دارید؟",
            "level": "B1"
          },
          {
            "en": "It's a new collection. The fabric is high-quality.",
            "fa": "این یک کلکسیون جدید است. پارچه کیفیت بالایی دارد.",
            "level": "B2"
          },
          {
            "en": "We accept all major cards.",
            "fa": "ما همه کارت‌های اصلی را قبول می‌کنیم.",
            "level": "B2"
          },
          {
            "en": "We can offer a discount on this item.",
            "fa": "ما می‌توانیم روی این کالا تخفیف بدهیم.",
            "level": "C1"
          },
          {
            "en": "I'd recommend exploring our eco-friendly line.",
            "fa": "من بررسی خط محصولات دوستدار محیط زیست ما را توصیه می‌کنم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Shopping in a supermarket",
        "context": "Someone is buying groceries and asking about products.",
        "speakerA": [
          {
            "en": "Where is the milk?",
            "fa": "شیر کجاست؟",
            "level": "A1"
          },
          {
            "en": "I need some bread and eggs.",
            "fa": "به نان و تخم‌مرغ نیاز دارم.",
            "level": "A1"
          },
          {
            "en": "How much are these apples?",
            "fa": "این سیب‌ها چند هستند؟",
            "level": "A2"
          },
          {
            "en": "Do you have any organic vegetables?",
            "fa": "سبزیجات ارگانیک دارید؟",
            "level": "A2"
          },
          {
            "en": "I'm looking for gluten-free products.",
            "fa": "به دنبال محصولات بدون گلوتن هستم.",
            "level": "B1"
          },
          {
            "en": "Is this cheese on sale?",
            "fa": "این پنیر حراج است؟",
            "level": "B1"
          },
          {
            "en": "Could you recommend a good red wine?",
            "fa": "می‌توانید یک شراب قرمز خوب پیشنهاد دهید؟",
            "level": "B2"
          },
          {
            "en": "I prefer locally sourced produce.",
            "fa": "من محصولات محلی را ترجیح می‌دهم.",
            "level": "B2"
          },
          {
            "en": "The packaging is excessive on these items.",
            "fa": "بسته‌بندی روی این اقلام بیش از حد است.",
            "level": "C1"
          },
          {
            "en": "I'm looking for artisanal products with authentic ingredients.",
            "fa": "به دنبال محصولات صنایع دستی با مواد اولیه اصیل هستم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "It's in aisle 3.",
            "fa": "در راهروی ۳ است.",
            "level": "A1"
          },
          {
            "en": "They are next to the bakery.",
            "fa": "آنها کنار نانوایی هستند.",
            "level": "A1"
          },
          {
            "en": "They're $2 per kilo.",
            "fa": "هر کیلو ۲ دلار است.",
            "level": "A2"
          },
          {
            "en": "Yes, they're in the organic section.",
            "fa": "بله، آنها در بخش ارگانیک هستند.",
            "level": "A2"
          },
          {
            "en": "We have a dedicated aisle for that.",
            "fa": "ما یک راهروی مخصوص برای آن داریم.",
            "level": "B1"
          },
          {
            "en": "Yes, it's 20% off today.",
            "fa": "بله، امروز ۲۰٪ تخفیف دارد.",
            "level": "B1"
          },
          {
            "en": "This Italian one is very popular.",
            "fa": "این ایتالیایی خیلی محبوب است.",
            "level": "B2"
          },
          {
            "en": "You'll find a good selection of local products here.",
            "fa": "در اینجا انتخاب خوبی از محصولات محلی پیدا می‌کنید.",
            "level": "B2"
          },
          {
            "en": "I agree. We're trying to reduce packaging waste.",
            "fa": "موافقم. ما در تلاش برای کاهش ضایعات بسته‌بندی هستیم.",
            "level": "C1"
          },
          {
            "en": "We have a range of gourmet products in our deli.",
            "fa": "ما مجموعه‌ای از محصولات لذیذ در بخش اغذیه‌فروشی داریم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Online shopping",
        "context": "Two friends talk about shopping online.",
        "speakerA": [
          {
            "en": "I bought a book online yesterday.",
            "fa": "دیروز یک کتاب آنلاین خریدم.",
            "level": "A1"
          },
          {
            "en": "Online shopping is very easy.",
            "fa": "خرید آنلاین خیلی آسان است.",
            "level": "A2"
          },
          {
            "en": "I ordered a new phone last week.",
            "fa": "هفته پیش یک گوشی جدید سفارش دادم.",
            "level": "A2"
          },
          {
            "en": "I need to get a good deal on some new shoes.",
            "fa": "باید یک کفش جدید با قیمت خوب پیدا کنم.",
            "level": "B1"
          },
          {
            "en": "I'm always hesitant about buying clothes online.",
            "fa": "من همیشه در مورد خرید لباس آنلاین مردد هستم.",
            "level": "B1"
          },
          {
            "en": "I like comparing prices from different sites.",
            "fa": "من دوست دارم قیمت‌ها را از سایت‌های مختلف مقایسه کنم.",
            "level": "B2"
          },
          {
            "en": "The user reviews are often quite helpful.",
            "fa": "بررسی‌های کاربران اغلب بسیار مفید هستند.",
            "level": "B2"
          },
          {
            "en": "I'm skeptical about the authenticity of some products.",
            "fa": "من در مورد اصالت برخی محصولات شک دارم.",
            "level": "C1"
          },
          {
            "en": "I've become more discerning about the sustainability of my purchases.",
            "fa": "من در مورد پایداری خریدهایم دقیق‌تر شده‌ام.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Great! Did it arrive?",
            "fa": "عالی! رسید؟",
            "level": "A1"
          },
          {
            "en": "Yes, it's very convenient.",
            "fa": "بله، خیلی راحت است.",
            "level": "A2"
          },
          {
            "en": "That's cool. What brand is it?",
            "fa": "خوبه. چه برندی است؟",
            "level": "A2"
          },
          {
            "en": "Check out this website, they have good offers.",
            "fa": "این وب‌سایت را ببین، پیشنهادات خوبی دارند.",
            "level": "B1"
          },
          {
            "en": "You should order from sites that have free returns.",
            "fa": "باید از سایت‌هایی سفارش بدی که بازگشت رایگان دارند.",
            "level": "B1"
          },
          {
            "en": "Me too, it saves a lot of money.",
            "fa": "منم همینطور، خیلی پول صرفه‌جویی می‌کند.",
            "level": "B2"
          },
          {
            "en": "Yes, but you have to be careful about fake reviews.",
            "fa": "بله، اما باید مراقب نظرات جعلی باشی.",
            "level": "B2"
          },
          {
            "en": "I've been burned by counterfeit items before.",
            "fa": "قبلاً توسط اقلام تقلبی سوخته‌ام.",
            "level": "C1"
          },
          {
            "en": "It's a conscientious approach to consumerism.",
            "fa": "این یک رویکرد وظیفه‌شناسانه به مصرف‌گرایی است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Asking for a discount or bargaining",
        "context": "At a market or small store, trying to get a better price.",
        "speakerA": [
          {
            "en": "Is there a discount?",
            "fa": "تخفیفی هست؟",
            "level": "A1"
          },
          {
            "en": "Can you give me a better price?",
            "fa": "می‌توانید قیمت بهتری به من بدهید؟",
            "level": "A2"
          },
          {
            "en": "I'll take two if you lower the price.",
            "fa": "اگر قیمت را کم کنید، دو تا می‌خرم.",
            "level": "A2"
          },
          {
            "en": "This is a bit too much for me.",
            "fa": "این کمی برای من زیاد است.",
            "level": "B1"
          },
          {
            "en": "I can get it cheaper at another store.",
            "fa": "می‌توانم آن را از فروشگاه دیگری ارزان‌تر بخرم.",
            "level": "B1"
          },
          {
            "en": "How about 20% off and we have a deal?",
            "fa": "۲۰٪ تخفیف و معامله می‌شود؟",
            "level": "B2"
          },
          {
            "en": "I'm willing to negotiate on the final price.",
            "fa": "من مایل به مذاکره در مورد قیمت نهایی هستم.",
            "level": "C1"
          },
          {
            "en": "Let's meet in the middle at a fair market value.",
            "fa": "بیایید وسط را با ارزش منصفانه بازار ملاقات کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "No, sorry. The price is fixed.",
            "fa": "نه، متاسفم. قیمت ثابت است.",
            "level": "A1"
          },
          {
            "en": "I can give you 10% off.",
            "fa": "می‌توانم ۱۰٪ تخفیف بدهم.",
            "level": "A2"
          },
          {
            "en": "If you buy two, I can reduce the price a little.",
            "fa": "اگر دو تا بخرید، می‌توانم قیمت را کمی کاهش دهم.",
            "level": "A2"
          },
          {
            "en": "This is the final price, I'm afraid.",
            "fa": "متاسفم، این قیمت نهایی است.",
            "level": "B1"
          },
          {
            "en": "This is a very high-quality item.",
            "fa": "این یک کالای با کیفیت بالا است.",
            "level": "B1"
          },
          {
            "en": "Alright, 15% off. That's my last offer.",
            "fa": "باشه، ۱۵٪ تخفیف. این آخرین پیشنهاد من است.",
            "level": "B2"
          },
          {
            "en": "I can consider a bulk purchase discount.",
            "fa": "می‌توانم تخفیف خرید عمده را در نظر بگیرم.",
            "level": "C1"
          },
          {
            "en": "Let's agree on a price that reflects the product's true value.",
            "fa": "بیایید بر سر قیمتی توافق کنیم که ارزش واقعی محصول را نشان دهد.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "علوم (Science)",
    "scenarios": [
      {
        "scenario": "Discussing scientific discoveries",
        "context": "Two people talk about a new scientific finding.",
        "speakerA": [
          {
            "en": "Science is very interesting.",
            "fa": "علم خیلی جالب است.",
            "level": "A1"
          },
          {
            "en": "I read about space exploration.",
            "fa": "در مورد اکتشافات فضایی خواندم.",
            "level": "A2"
          },
          {
            "en": "Did you hear about the new planet discovery?",
            "fa": "در مورد کشف سیاره جدید شنیدی؟",
            "level": "A2"
          },
          {
            "en": "The article about climate change was very informative.",
            "fa": "مقاله در مورد تغییرات آب و هوایی بسیار آموزنده بود.",
            "level": "B1"
          },
          {
            "en": "I think we need more funding for medical research.",
            "fa": "فکر می‌کنم به بودجه بیشتری برای تحقیقات پزشکی نیاز داریم.",
            "level": "B1"
          },
          {
            "en": "The scientific method is crucial for objective analysis.",
            "fa": "روش علمی برای تحلیل عینی بسیار مهم است.",
            "level": "B2"
          },
          {
            "en": "I'm fascinated by the advances in quantum computing.",
            "fa": "من مجذوب پیشرفت‌های رایانش کوانتومی هستم.",
            "level": "C1"
          },
          {
            "en": "The ethical implications of gene editing are profound.",
            "fa": "پیامدهای اخلاقی ویرایش ژن بسیار عمیق است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I think so too.",
            "fa": "بله، من هم همینطور فکر می‌کنم.",
            "level": "A1"
          },
          {
            "en": "Me too. It's amazing.",
            "fa": "منم همینطور. شگفت‌انگیز است.",
            "level": "A2"
          },
          {
            "en": "No, tell me more about it!",
            "fa": "نه، بیشتر در موردش به من بگو!",
            "level": "A2"
          },
          {
            "en": "I read it too. It was eye-opening.",
            "fa": "من هم خواندمش. بسیار روشن‌کننده بود.",
            "level": "B1"
          },
          {
            "en": "I completely agree.",
            "fa": "کاملاً موافقم.",
            "level": "B1"
          },
          {
            "en": "Absolutely, it eliminates personal bias.",
            "fa": "دقیقاً، سوگیری شخصی را از بین می‌برد.",
            "level": "B2"
          },
          {
            "en": "It's a field that's constantly evolving.",
            "fa": "این حوزه‌ای است که مدام در حال تکامل است.",
            "level": "C1"
          },
          {
            "en": "We must consider both the benefits and the risks.",
            "fa": "ما باید هم مزایا و هم خطرات را در نظر بگیریم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about technology and gadgets",
        "context": "A conversation about new technological devices.",
        "speakerA": [
          {
            "en": "I want to buy a new phone.",
            "fa": "می‌خواهم یک گوشی جدید بخرم.",
            "level": "A1"
          },
          {
            "en": "The new laptop is very fast.",
            "fa": "لپ‌تاپ جدید خیلی سریع است.",
            "level": "A2"
          },
          {
            "en": "Do you use any social media?",
            "fa": "از شبکه‌های اجتماعی استفاده می‌کنی؟",
            "level": "A2"
          },
          {
            "en": "I think smartwatches are really useful.",
            "fa": "فکر می‌کنم ساعت‌های هوشمند واقعاً مفید هستند.",
            "level": "B1"
          },
          {
            "en": "Technology has changed our lives completely.",
            "fa": "فناوری زندگی ما را کاملاً تغییر داده است.",
            "level": "B1"
          },
          {
            "en": "I'm trying to reduce my screen time.",
            "fa": "سعی می‌کنم زمان استفاده از صفحه نمایش را کاهش دهم.",
            "level": "B2"
          },
          {
            "en": "Artificial intelligence is transforming industries.",
            "fa": "هوش مصنوعی در حال متحول کردن صنایع است.",
            "level": "C1"
          },
          {
            "en": "The integration of IoT into our daily lives is fascinating.",
            "fa": "ادغام اینترنت اشیا در زندگی روزمره ما جذاب است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Which one are you thinking of?",
            "fa": "به کدام یکی فکر می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "Is it better than the old one?",
            "fa": "آیا از قدیمی بهتر است؟",
            "level": "A2"
          },
          {
            "en": "Yes, I'm on Instagram and WhatsApp.",
            "fa": "بله، من در اینستاگرام و واتس‌اپ هستم.",
            "level": "A2"
          },
          {
            "en": "I agree, they track your fitness well.",
            "fa": "موافقم، تناسب اندام شما را به خوبی ردیابی می‌کنند.",
            "level": "B1"
          },
          {
            "en": "Yes, it's both good and bad, I suppose.",
            "fa": "بله، به گمانم هم خوب است و هم بد.",
            "level": "B1"
          },
          {
            "en": "That's a good goal. I should try too.",
            "fa": "هدف خوبی است. منم باید امتحان کنم.",
            "level": "B2"
          },
          {
            "en": "It certainly is a game-changer.",
            "fa": "قطعاً یک تغییردهنده بازی است.",
            "level": "C1"
          },
          {
            "en": "It's remarkable how connected everything has become.",
            "fa": "قابل توجه است که چگونه همه چیز به هم متصل شده است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Explaining a scientific concept",
        "context": "One person explains something scientific to another.",
        "speakerA": [
          {
            "en": "Water is essential for life.",
            "fa": "آب برای زندگی ضروری است.",
            "level": "A1"
          },
          {
            "en": "The Earth goes around the Sun.",
            "fa": "زمین به دور خورشید می‌چرخد.",
            "level": "A2"
          },
          {
            "en": "Plants make their own food through photosynthesis.",
            "fa": "گیاهان غذا خود را از طریق فتوسنتز درست می‌کنند.",
            "level": "A2"
          },
          {
            "en": "Vaccines help our immune system fight diseases.",
            "fa": "واکسن‌ها به سیستم ایمنی ما کمک می‌کنند تا با بیماری‌ها مبارزه کند.",
            "level": "B1"
          },
          {
            "en": "Gravity is the force that keeps us on the ground.",
            "fa": "جاذبه نیرویی است که ما را روی زمین نگه می‌دارد.",
            "level": "B1"
          },
          {
            "en": "E=mc² explains the relationship between mass and energy.",
            "fa": "E=mc² رابطه بین جرم و انرژی را توضیح می‌دهد.",
            "level": "B2"
          },
          {
            "en": "Quantum mechanics challenges our classical understanding of reality.",
            "fa": "مکانیک کوانتومی درک کلاسیک ما از واقعیت را به چالش می‌کشد.",
            "level": "C1"
          },
          {
            "en": "The complexity of DNA's structure is breathtaking.",
            "fa": "پیچیدگی ساختار DNA نفس‌گیر است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I know.",
            "fa": "بله، می‌دانم.",
            "level": "A1"
          },
          {
            "en": "That's right.",
            "fa": "درست است.",
            "level": "A2"
          },
          {
            "en": "I learned that in school.",
            "fa": "آن را در مدرسه یاد گرفتم.",
            "level": "A2"
          },
          {
            "en": "That's why they are so important.",
            "fa": "به همین دلیل است که آنها خیلی مهم هستند.",
            "level": "B1"
          },
          {
            "en": "That makes sense.",
            "fa": "منطقی است.",
            "level": "B1"
          },
          {
            "en": "It's a very famous equation.",
            "fa": "این یک معادله بسیار معروف است.",
            "level": "B2"
          },
          {
            "en": "It's a mind-bending subject, isn't it?",
            "fa": "این یک موضوع گیج‌کننده است، اینطور نیست؟",
            "level": "C1"
          },
          {
            "en": "The sheer intricacy of it is awe-inspiring.",
            "fa": "پیچیدگی محض آن الهام‌بخش است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "مسائل اجتماعی (Social Issues)",
    "scenarios": [
      {
        "scenario": "Discussing education",
        "context": "People talk about the education system and its challenges.",
        "speakerA": [
          {
            "en": "Education is very important.",
            "fa": "آموزش و پرورش بسیار مهم است.",
            "level": "A1"
          },
          {
            "en": "Every child should go to school.",
            "fa": "هر کودکی باید به مدرسه برود.",
            "level": "A2"
          },
          {
            "en": "Teachers need more support.",
            "fa": "معلمان به حمایت بیشتری نیاز دارند.",
            "level": "A2"
          },
          {
            "en": "Public schools are struggling in my area.",
            "fa": "مدارس دولتی در منطقه من در حال مبارزه هستند.",
            "level": "B1"
          },
          {
            "en": "I think education should be free for everyone.",
            "fa": "فکر می‌کنم آموزش باید برای همه رایگان باشد.",
            "level": "B1"
          },
          {
            "en": "Online learning has become more common.",
            "fa": "یادگیری آنلاین رایج‌تر شده است.",
            "level": "B2"
          },
          {
            "en": "The disparity in educational access is concerning.",
            "fa": "نابرابری در دسترسی به آموزش نگران‌کننده است.",
            "level": "C1"
          },
          {
            "en": "We need to reform the curriculum to promote critical thinking.",
            "fa": "ما نیاز به اصلاح برنامه درسی برای ترویج تفکر انتقادی داریم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I agree.",
            "fa": "بله، موافقم.",
            "level": "A1"
          },
          {
            "en": "Absolutely, it's their right.",
            "fa": "کاملاً، این حق آنهاست.",
            "level": "A2"
          },
          {
            "en": "I think so too. They are underpaid.",
            "fa": "منم همینطور فکر می‌کنم. آنها کم‌حقوق هستند.",
            "level": "A2"
          },
          {
            "en": "That's sad. They need more funding.",
            "fa": "این ناراحت‌کننده است. آنها به بودجه بیشتری نیاز دارند.",
            "level": "B1"
          },
          {
            "en": "I agree, but how do we pay for it?",
            "fa": "موافقم، اما چگونه هزینه آن را پرداخت می‌کنیم؟",
            "level": "B1"
          },
          {
            "en": "True, it offers more flexibility.",
            "fa": "درست است، انعطاف‌پذیری بیشتری ارائه می‌دهد.",
            "level": "B2"
          },
          {
            "en": "It perpetuates inequality.",
            "fa": "این نابرابری را تداوم می‌بخشد.",
            "level": "C1"
          },
          {
            "en": "I strongly support a more holistic educational approach.",
            "fa": "من به شدت از رویکرد آموزشی جامع‌تر حمایت می‌کنم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing poverty and homelessness",
        "context": "A conversation about social inequality and poverty.",
        "speakerA": [
          {
            "en": "There are many homeless people in the city.",
            "fa": "تعداد زیادی بی‌خانمان در شهر وجود دارد.",
            "level": "A2"
          },
          {
            "en": "Poverty is a big problem.",
            "fa": "فقر یک مشکل بزرگ است.",
            "level": "A2"
          },
          {
            "en": "We should help the poor.",
            "fa": "ما باید به فقرا کمک کنیم.",
            "level": "A2"
          },
          {
            "en": "I donate to local charities every month.",
            "fa": "من هر ماه به خیریه‌های محلی کمک مالی می‌کنم.",
            "level": "B1"
          },
          {
            "en": "The government should do more to solve this issue.",
            "fa": "دولت باید کار بیشتری برای حل این مشکل انجام دهد.",
            "level": "B1"
          },
          {
            "en": "There are many root causes of poverty.",
            "fa": "دلایل ریشه‌ای زیادی برای فقر وجود دارد.",
            "level": "B2"
          },
          {
            "en": "It's a systemic problem that requires policy changes.",
            "fa": "این یک مشکل سیستمی است که نیاز به تغییرات سیاستی دارد.",
            "level": "C1"
          },
          {
            "en": "The wealth gap is widening and it's deeply concerning.",
            "fa": "شکاف ثروت در حال گسترش است و بسیار نگران‌کننده است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "It's very sad.",
            "fa": "خیلی غم‌انگیز است.",
            "level": "A2"
          },
          {
            "en": "Yes, it's everywhere.",
            "fa": "بله، همه جا هست.",
            "level": "A2"
          },
          {
            "en": "That's very kind of you.",
            "fa": "این خیلی مهربانانه از شماست.",
            "level": "A2"
          },
          {
            "en": "That's wonderful! Which charity?",
            "fa": "این فوق‌العاده است! کدام خیریه؟",
            "level": "B1"
          },
          {
            "en": "I agree, but it's a complex issue.",
            "fa": "موافقم، اما این یک مسئله پیچیده است.",
            "level": "B1"
          },
          {
            "en": "Exactly, like lack of education and jobs.",
            "fa": "دقیقاً، مانند کمبود آموزش و شغل.",
            "level": "B2"
          },
          {
            "en": "We need to address the underlying structures.",
            "fa": "ما باید به ساختارهای زیرین بپردازیم.",
            "level": "C1"
          },
          {
            "en": "We need comprehensive social safety nets.",
            "fa": "ما به شبکه‌های جامع ایمنی اجتماعی نیاز داریم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about discrimination and equality",
        "context": "People discuss discrimination and the fight for equality.",
        "speakerA": [
          {
            "en": "Everyone should be treated equally.",
            "fa": "همه باید به طور مساوی رفتار شوند.",
            "level": "A1"
          },
          {
            "en": "Discrimination is wrong.",
            "fa": "تبعیض اشتباه است.",
            "level": "A2"
          },
          {
            "en": "Women deserve the same rights as men.",
            "fa": "زنان شایسته حقوق یکسان با مردان هستند.",
            "level": "A2"
          },
          {
            "en": "Racism is still a big problem in many places.",
            "fa": "نژادپرستی هنوز در بسیاری از مکان‌ها یک مشکل بزرگ است.",
            "level": "B1"
          },
          {
            "en": "I think we are making progress, but slowly.",
            "fa": "فکر می‌کنم در حال پیشرفت هستیم، اما به آرامی.",
            "level": "B1"
          },
          {
            "en": "It's important to speak up against injustice.",
            "fa": "مهم است که در برابر بی‌عدالتی صحبت کنیم.",
            "level": "B2"
          },
          {
            "en": "We must challenge our own biases and prejudices.",
            "fa": "ما باید با تعصبات و پیشداوری‌های خود مبارزه کنیم.",
            "level": "C1"
          },
          {
            "en": "Equity requires dismantling systemic barriers.",
            "fa": "برابری مستلزم از بین بردن موانع سیستمی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I completely agree.",
            "fa": "کاملاً موافقم.",
            "level": "A1"
          },
          {
            "en": "Yes, it should never happen.",
            "fa": "بله، هرگز نباید اتفاق بیفتد.",
            "level": "A2"
          },
          {
            "en": "Definitely, it's a basic human right.",
            "fa": "قطعاً، این یک حق اساسی بشر است.",
            "level": "A2"
          },
          {
            "en": "I know, it's heartbreaking.",
            "fa": "می‌دانم، قلب‌شکن است.",
            "level": "B1"
          },
          {
            "en": "I agree, change takes time.",
            "fa": "موافقم، تغییر زمان می‌برد.",
            "level": "B1"
          },
          {
            "en": "I couldn't agree more. Silence is complicity.",
            "fa": "کاملاً موافقم. سکوت همدستی است.",
            "level": "B2"
          },
          {
            "en": "Unconscious biases are deeply ingrained.",
            "fa": "سوگیری‌های ناخودآگاه عمیقاً ریشه‌دار هستند.",
            "level": "C1"
          },
          {
            "en": "True equality requires a fundamental shift.",
            "fa": "برابری واقعی نیاز به یک تغییر اساسی دارد.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing healthcare access",
        "context": "Two people talk about the availability of medical care.",
        "speakerA": [
          {
            "en": "Healthcare is important.",
            "fa": "بهداشت و درمان مهم است.",
            "level": "A1"
          },
          {
            "en": "Some people don't have health insurance.",
            "fa": "بعضی از مردم بیمه درمانی ندارند.",
            "level": "A2"
          },
          {
            "en": "The hospital near me is very busy.",
            "fa": "بیمارستان نزدیک من خیلی شلوغ است.",
            "level": "A2"
          },
          {
            "en": "I think healthcare should be free for everyone.",
            "fa": "فکر می‌کنم مراقبت‌های بهداشتی باید برای همه رایگان باشد.",
            "level": "B1"
          },
          {
            "en": "The cost of medicine is rising rapidly.",
            "fa": "هزینه دارو به سرعت در حال افزایش است.",
            "level": "B1"
          },
          {
            "en": "Preventive care is more effective and cheaper.",
            "fa": "مراقبت‌های پیشگیرانه مؤثرتر و ارزان‌تر است.",
            "level": "B2"
          },
          {
            "en": "We need to address the root causes of health disparities.",
            "fa": "ما باید به ریشه‌های نابرابری‌های بهداشتی بپردازیم.",
            "level": "C1"
          },
          {
            "en": "The healthcare system is often inefficient and inequitable.",
            "fa": "سیستم مراقبت‌های بهداشتی اغلب ناکارآمد و ناعادلانه است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's necessary.",
            "fa": "بله، ضروری است.",
            "level": "A1"
          },
          {
            "en": "That's terrible. Everyone should have coverage.",
            "fa": "وحشتناک است. همه باید تحت پوشش باشند.",
            "level": "A2"
          },
          {
            "en": "I know, the wait times are long.",
            "fa": "می‌دانم، زمان انتظار طولانی است.",
            "level": "A2"
          },
          {
            "en": "I support that idea, but funding is a challenge.",
            "fa": "من از این ایده حمایت می‌کنم، اما تأمین مالی چالش است.",
            "level": "B1"
          },
          {
            "en": "Yes, it's becoming unaffordable.",
            "fa": "بله، غیرقابل تحمل می‌شود.",
            "level": "B1"
          },
          {
            "en": "Exactly, it's better for everyone in the long run.",
            "fa": "دقیقاً، در بلندمدت برای همه بهتر است.",
            "level": "B2"
          },
          {
            "en": "Social determinants of health play a huge role.",
            "fa": "تعیین‌کننده‌های اجتماعی سلامت نقش بزرگی دارند.",
            "level": "C1"
          },
          {
            "en": "We need a more patient-centric approach.",
            "fa": "ما به رویکردی بیمار-محورتر نیاز داریم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about climate change and pollution",
        "context": "People discuss the impact of human activities on the planet.",
        "speakerA": [
          {
            "en": "We should recycle more.",
            "fa": "ما باید بیشتر بازیافت کنیم.",
            "level": "A1"
          },
          {
            "en": "The air in the city is dirty.",
            "fa": "هوا در شهر آلوده است.",
            "level": "A2"
          },
          {
            "en": "Climate change is getting worse.",
            "fa": "تغییرات اقلیمی در حال بدتر شدن است.",
            "level": "A2"
          },
          {
            "en": "We need to use less plastic.",
            "fa": "ما باید از پلاستیک کمتری استفاده کنیم.",
            "level": "B1"
          },
          {
            "en": "Renewable energy is the future.",
            "fa": "انرژی تجدیدپذیر آینده است.",
            "level": "B1"
          },
          {
            "en": "Individual actions matter, but we need corporate responsibility.",
            "fa": "اقدامات فردی مهم است، اما ما به مسئولیت شرکتی نیاز داریم.",
            "level": "B2"
          },
          {
            "en": "The political will to address the crisis is insufficient.",
            "fa": "اراده سیاسی برای مقابله با بحران کافی نیست.",
            "level": "C1"
          },
          {
            "en": "We're facing an existential threat that requires global cooperation.",
            "fa": "ما با یک تهدید وجودی روبرو هستیم که نیازمند همکاری جهانی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, we should.",
            "fa": "بله، باید.",
            "level": "A1"
          },
          {
            "en": "I know, it's hard to breathe sometimes.",
            "fa": "می‌دانم، گاهی نفس کشیدن سخت است.",
            "level": "A2"
          },
          {
            "en": "I'm really worried about it.",
            "fa": "واقعاً نگران آن هستم.",
            "level": "A2"
          },
          {
            "en": "I agree, I'm trying to do the same.",
            "fa": "موافقم، سعی می‌کنم همین کار را بکنم.",
            "level": "B1"
          },
          {
            "en": "Absolutely, solar power is becoming cheaper.",
            "fa": "کاملاً، انرژی خورشیدی ارزان‌تر می‌شود.",
            "level": "B1"
          },
          {
            "en": "True, big polluters must be held accountable.",
            "fa": "درست است، آلوده‌کنندگان بزرگ باید پاسخگو باشند.",
            "level": "B2"
          },
          {
            "en": "It's a matter of collective survival.",
            "fa": "این یک مسئله بقای جمعی است.",
            "level": "C1"
          },
          {
            "en": "We're in a race against time.",
            "fa": "ما در یک مسابقه با زمان هستیم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing mental health awareness",
        "context": "Talking about the importance of mental health.",
        "speakerA": [
          {
            "en": "Mental health is important.",
            "fa": "سلامت روان مهم است.",
            "level": "A1"
          },
          {
            "en": "I feel stressed sometimes.",
            "fa": "گاهی احساس استرس می‌کنم.",
            "level": "A2"
          },
          {
            "en": "It's okay to ask for help.",
            "fa": "درخواست کمک اشکالی ندارد.",
            "level": "A2"
          },
          {
            "en": "I think we should talk more about mental health.",
            "fa": "فکر می‌کنم باید بیشتر درباره سلامت روان صحبت کنیم.",
            "level": "B1"
          },
          {
            "en": "Therapy can be very beneficial.",
            "fa": "رواندرمانی می‌تواند بسیار مفید باشد.",
            "level": "B1"
          },
          {
            "en": "We need to break the stigma around mental illness.",
            "fa": "ما باید انگ بیماری روانی را بشکنیم.",
            "level": "B2"
          },
          {
            "en": "Early intervention is crucial for recovery.",
            "fa": "مداخله زودهنگام برای بهبودی بسیار مهم است.",
            "level": "C1"
          },
          {
            "en": "We must treat mental health with the same seriousness as physical health.",
            "fa": "ما باید با سلامت روان با همان جدیتی رفتار کنیم که با سلامت جسمی داریم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it really is.",
            "fa": "بله، واقعاً مهم است.",
            "level": "A1"
          },
          {
            "en": "Me too. I try to relax.",
            "fa": "منم همینطور. سعی می‌کنم آرام شوم.",
            "level": "A2"
          },
          {
            "en": "I agree, no one should be ashamed.",
            "fa": "موافقم، هیچ کس نباید خجالت بکشد.",
            "level": "A2"
          },
          {
            "en": "Definitely, it's a sign of strength.",
            "fa": "قطعاً، این نشانه قدرت است.",
            "level": "B1"
          },
          {
            "en": "I've heard good things about it.",
            "fa": "چیزهای خوبی در موردش شنیده‌ام.",
            "level": "B1"
          },
          {
            "en": "Yes, people need to feel safe to speak up.",
            "fa": "بله، مردم باید احساس امنیت کنند تا صحبت کنند.",
            "level": "B2"
          },
          {
            "en": "It can prevent more serious problems.",
            "fa": "می‌تواند از مشکلات جدی‌تر جلوگیری کند.",
            "level": "C1"
          },
          {
            "en": "It should be integrated into all aspects of care.",
            "fa": "باید در تمام جنبه‌های مراقبت ادغام شود.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "فناوری (Technology)",
    "scenarios": [
      {
        "scenario": "Using a new smartphone",
        "context": "A person has just bought a new phone and is discussing its features.",
        "speakerA": [
          {
            "en": "I got a new phone!",
            "fa": "یک گوشی جدید گرفتم!",
            "level": "A1"
          },
          {
            "en": "It has a great camera.",
            "fa": "دوربین خوبی دارد.",
            "level": "A2"
          },
          {
            "en": "The battery life is amazing.",
            "fa": "عمر باتری شگفت‌انگیز است.",
            "level": "A2"
          },
          {
            "en": "This app helps me stay organized.",
            "fa": "این برنامه به من کمک می‌کند تا منظم بمانم.",
            "level": "B1"
          },
          {
            "en": "I'm still getting used to the interface.",
            "fa": "هنوز دارم به رابط کاربری عادت می‌کنم.",
            "level": "B1"
          },
          {
            "en": "The security features are quite advanced.",
            "fa": "ویژگی‌های امنیتی نسبتاً پیشرفته هستند.",
            "level": "B2"
          },
          {
            "en": "I'm impressed by the AI integration.",
            "fa": "من از ادغام هوش مصنوعی تحت تأثیر قرار گرفته‌ام.",
            "level": "C1"
          },
          {
            "en": "The ecosystem integration across devices is seamless.",
            "fa": "ادغام اکوسیستم در میان دستگاه‌ها یکپارچه است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Wow, show me!",
            "fa": "واو، به من نشان بده!",
            "level": "A1"
          },
          {
            "en": "Let me see a photo.",
            "fa": "بگذار یک عکس ببینم.",
            "level": "A2"
          },
          {
            "en": "How long does it last?",
            "fa": "چقدر دوام می‌آورد؟",
            "level": "A2"
          },
          {
            "en": "What app is that?",
            "fa": "آن چه برنامه‌ای است؟",
            "level": "B1"
          },
          {
            "en": "Is it very different from the older version?",
            "fa": "آیا با نسخه قدیمی خیلی متفاوت است؟",
            "level": "B1"
          },
          {
            "en": "It sounds very secure.",
            "fa": "به نظر بسیار امن می‌رسد.",
            "level": "B2"
          },
          {
            "en": "AI is becoming incredibly powerful.",
            "fa": "هوش مصنوعی به طرز باورنکردنی قدرتمند می‌شود.",
            "level": "C1"
          },
          {
            "en": "The interoperability is a game-changer.",
            "fa": "قابلیت هم‌کاری یک تغییردهنده بازی است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Asking for tech support",
        "context": "Someone needs help with a computer or software problem.",
        "speakerA": [
          {
            "en": "My computer isn't working.",
            "fa": "کامپیوتر من کار نمی‌کند.",
            "level": "A1"
          },
          {
            "en": "How do I turn on Wi-Fi?",
            "fa": "چگونه وای‌فای را روشن کنم؟",
            "level": "A2"
          },
          {
            "en": "I can't open this file.",
            "fa": "نمی‌توانم این فایل را باز کنم.",
            "level": "A2"
          },
          {
            "en": "The internet is very slow today.",
            "fa": "امروز اینترنت خیلی کند است.",
            "level": "B1"
          },
          {
            "en": "I need to reset my password.",
            "fa": "باید رمز عبورم را بازنشانی کنم.",
            "level": "B1"
          },
          {
            "en": "The software keeps crashing.",
            "fa": "نرم‌افزار مدام از کار می‌افتد.",
            "level": "B2"
          },
          {
            "en": "I'm having trouble configuring the network settings.",
            "fa": "در تنظیم تنظیمات شبکه مشکل دارم.",
            "level": "C1"
          },
          {
            "en": "I'm encountering a kernel panic error.",
            "fa": "من با خطای وحشت هسته مواجه می‌شوم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Try restarting it.",
            "fa": "سعی کن آن را ری‌استارت کنی.",
            "level": "A1"
          },
          {
            "en": "Go to settings, then connections.",
            "fa": "به تنظیمات برو، سپس اتصالات.",
            "level": "A2"
          },
          {
            "en": "Maybe you need the right software.",
            "fa": "شاید به نرم‌افزار درست نیاز داشته باشی.",
            "level": "A2"
          },
          {
            "en": "Call your provider, maybe it's their issue.",
            "fa": "به ارائه‌دهنده خود زنگ بزن، شاید مشکل از آنهاست.",
            "level": "B1"
          },
          {
            "en": "I can help you with that. Click on 'forgot password'.",
            "fa": "می‌توانم در آن کمک کنم. روی 'رمز عبور را فراموش کرده‌اید' کلیک کن.",
            "level": "B1"
          },
          {
            "en": "That's frustrating. Try updating the software.",
            "fa": "این آزاردهنده است. سعی کن نرم‌افزار را به‌روز کنی.",
            "level": "B2"
          },
          {
            "en": "We might need to check the firewall settings.",
            "fa": "ممکن است نیاز به بررسی تنظیمات فایروال داشته باشیم.",
            "level": "C1"
          },
          {
            "en": "I recommend a system diagnostic test.",
            "fa": "من یک تست تشخیصی سیستم را توصیه می‌کنم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing artificial intelligence",
        "context": "Conversation about AI and its impact on life.",
        "speakerA": [
          {
            "en": "AI is everywhere now.",
            "fa": "هوش مصنوعی الان همه جا هست.",
            "level": "A1"
          },
          {
            "en": "I use voice assistants sometimes.",
            "fa": "من گاهی از دستیارهای صوتی استفاده می‌کنم.",
            "level": "A2"
          },
          {
            "en": "AI can help in many ways.",
            "fa": "هوش مصنوعی می‌تواند از بسیاری جهات کمک کند.",
            "level": "A2"
          },
          {
            "en": "I'm worried about AI replacing jobs.",
            "fa": "نگران این هستم که هوش مصنوعی جایگزین شغل‌ها شود.",
            "level": "B1"
          },
          {
            "en": "AI is improving healthcare.",
            "fa": "هوش مصنوعی در حال بهبود مراقبت‌های بهداشتی است.",
            "level": "B1"
          },
          {
            "en": "We need to regulate AI development.",
            "fa": "ما باید توسعه هوش مصنوعی را تنظیم کنیم.",
            "level": "B2"
          },
          {
            "en": "AGI could potentially solve complex problems.",
            "fa": "هوش عمومی مصنوعی به طور بالقوه می‌تواند مشکلات پیچیده را حل کند.",
            "level": "C1"
          },
          {
            "en": "The alignment problem is one of the most critical issues in AI.",
            "fa": "مشکل هم‌راستایی یکی از بحرانی‌ترین مسائل در هوش مصنوعی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's getting more common.",
            "fa": "بله، در حال رایج‌تر شدن است.",
            "level": "A1"
          },
          {
            "en": "Me too. They are quite useful.",
            "fa": "منم همینطور. آنها بسیار مفید هستند.",
            "level": "A2"
          },
          {
            "en": "I agree, but we must be careful.",
            "fa": "موافقم، اما باید مراقب باشیم.",
            "level": "A2"
          },
          {
            "en": "I understand the concern.",
            "fa": "نگرانی را درک می‌کنم.",
            "level": "B1"
          },
          {
            "en": "That's a promising application.",
            "fa": "این یک کاربرد امیدوارکننده است.",
            "level": "B1"
          },
          {
            "en": "Ethical guidelines are essential.",
            "fa": "راهنماهای اخلاقی ضروری هستند.",
            "level": "B2"
          },
          {
            "en": "It's a double-edged sword.",
            "fa": "این یک شمشیر دو لبه است.",
            "level": "C1"
          },
          {
            "en": "We need to prioritize safety and transparency.",
            "fa": "ما باید ایمنی و شفافیت را اولویت قرار دهیم.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about cybersecurity",
        "context": "People discuss online safety and privacy.",
        "speakerA": [
          {
            "en": "I use strong passwords.",
            "fa": "من از رمزهای عبور قوی استفاده می‌کنم.",
            "level": "A2"
          },
          {
            "en": "Online privacy is important.",
            "fa": "حریم خصوصی آنلاین مهم است.",
            "level": "A2"
          },
          {
            "en": "I got a suspicious email yesterday.",
            "fa": "دیروز یک ایمیل مشکوک دریافت کردم.",
            "level": "A2"
          },
          {
            "en": "I never click on unknown links.",
            "fa": "من هرگز روی لینک‌های ناشناس کلیک نمی‌کنم.",
            "level": "B1"
          },
          {
            "en": "Two-factor authentication adds security.",
            "fa": "احراز هویت دو مرحله‌ای امنیت را افزایش می‌دهد.",
            "level": "B1"
          },
          {
            "en": "Data breaches are becoming more frequent.",
            "fa": "نقض‌های داده در حال مکررتر شدن هستند.",
            "level": "B2"
          },
          {
            "en": "Privacy regulations are essential in the digital age.",
            "fa": "مقررات حریم خصوصی در عصر دیجیتال ضروری است.",
            "level": "C1"
          },
          {
            "en": "We need to shift to a zero-trust security model.",
            "fa": "ما باید به یک مدل امنیتی بدون اعتماد تغییر کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a good habit.",
            "fa": "این یک عادت خوب است.",
            "level": "A2"
          },
          {
            "en": "Yes, we should protect our data.",
            "fa": "بله، ما باید از داده‌های خود محافظت کنیم.",
            "level": "A2"
          },
          {
            "en": "Be careful! It might be a scam.",
            "fa": "مراقب باش! ممکن است کلاهبرداری باشد.",
            "level": "A2"
          },
          {
            "en": "I also try to be careful online.",
            "fa": "من هم سعی می‌کنم آنلاین مراقب باشم.",
            "level": "B1"
          },
          {
            "en": "I use it on all my important accounts.",
            "fa": "من از آن در تمام حساب‌های مهم خود استفاده می‌کنم.",
            "level": "B1"
          },
          {
            "en": "It's a major risk now.",
            "fa": "الان یک خطر بزرگ است.",
            "level": "B2"
          },
          {
            "en": "Companies must be transparent about data use.",
            "fa": "شرکت‌ها باید در مورد استفاده از داده شفاف باشند.",
            "level": "C1"
          },
          {
            "en": "That's the only way to ensure trust.",
            "fa": "این تنها راه برای تضمین اعتماد است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing social media",
        "context": "Two people talk about social media usage and its effects.",
        "speakerA": [
          {
            "en": "Do you use social media?",
            "fa": "آیا از رسانه‌های اجتماعی استفاده می‌کنی؟",
            "level": "A1"
          },
          {
            "en": "I like Instagram.",
            "fa": "اینستاگرام را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "I spend too much time on it.",
            "fa": "وقت زیادی را روی آن می‌گذرانم.",
            "level": "A2"
          },
          {
            "en": "It's a good way to stay connected.",
            "fa": "این یک راه خوب برای در ارتباط ماندن است.",
            "level": "B1"
          },
          {
            "en": "I think social media can be negative sometimes.",
            "fa": "فکر می‌کنم رسانه‌های اجتماعی گاهی می‌توانند منفی باشند.",
            "level": "B1"
          },
          {
            "en": "It can cause anxiety and comparison.",
            "fa": "می‌تواند باعث اضطراب و مقایسه شود.",
            "level": "B2"
          },
          {
            "en": "Digital well-being is a growing concern.",
            "fa": "سلامت دیجیتال یک نگرانی رو به رشد است.",
            "level": "C1"
          },
          {
            "en": "We need to promote more meaningful interactions online.",
            "fa": "ما باید تعاملات معنادارتر آنلاین را ترویج کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, I use Twitter a lot.",
            "fa": "بله، زیاد از توییتر استفاده می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I prefer Facebook.",
            "fa": "من فیسبوک را ترجیح می‌دهم.",
            "level": "A2"
          },
          {
            "en": "I think many people do.",
            "fa": "فکر می‌کنم بسیاری از مردم اینطور هستند.",
            "level": "A2"
          },
          {
            "en": "True, I chat with family abroad.",
            "fa": "درسته، با خانواده خارج از کشور چت می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I agree, it has its pros and cons.",
            "fa": "موافقم، جوانب مثبت و منفی خود را دارد.",
            "level": "B1"
          },
          {
            "en": "Definitely, we should be mindful.",
            "fa": "قطعاً، ما باید آگاه باشیم.",
            "level": "B2"
          },
          {
            "en": "We need more education on digital literacy.",
            "fa": "ما به آموزش بیشتر در مورد سواد دیجیتال نیاز داریم.",
            "level": "C1"
          },
          {
            "en": "We must foster a healthier online environment.",
            "fa": "ما باید یک محیط آنلاین سالم‌تر ایجاد کنیم.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "سفر و گردشگری (Travel and Tourism)",
    "scenarios": [
      {
        "scenario": "Planning a trip",
        "context": "Two friends are discussing an upcoming vacation.",
        "speakerA": [
          {
            "en": "I want to travel to Italy.",
            "fa": "من می‌خواهم به ایتالیا سفر کنم.",
            "level": "A1"
          },
          {
            "en": "When is the best time to visit?",
            "fa": "بهترین زمان برای بازدید کی است؟",
            "level": "A2"
          },
          {
            "en": "I need to book a hotel.",
            "fa": "من باید یک هتل رزرو کنم.",
            "level": "A2"
          },
          {
            "en": "We should plan our itinerary carefully.",
            "fa": "ما باید برنامه سفر خود را با دقت برنامه‌ریزی کنیم.",
            "level": "B1"
          },
          {
            "en": "I prefer to travel during the off-season.",
            "fa": "من ترجیح می‌دهم در خارج از فصل سفر کنم.",
            "level": "B1"
          },
          {
            "en": "We need to consider the budget for this trip.",
            "fa": "ما باید بودجه این سفر را در نظر بگیریم.",
            "level": "B2"
          },
          {
            "en": "Sustainable tourism practices are increasingly important.",
            "fa": "شیوه‌های گردشگری پایدار به طور فزاینده‌ای مهم هستند.",
            "level": "C1"
          },
          {
            "en": "We should immerse ourselves in the local culture.",
            "fa": "ما باید خود را در فرهنگ محلی غرق کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a great idea.",
            "fa": "این ایده خوبی است.",
            "level": "A1"
          },
          {
            "en": "I think spring is lovely.",
            "fa": "فکر می‌کنم بهار زیبا است.",
            "level": "A2"
          },
          {
            "en": "I can help you find one.",
            "fa": "من می‌توانم به شما در پیدا کردن یکی کمک کنم.",
            "level": "A2"
          },
          {
            "en": "Yes, we don't want to miss anything.",
            "fa": "بله، ما نمی‌خواهیم چیزی را از دست بدهیم.",
            "level": "B1"
          },
          {
            "en": "That's smart, it's less crowded.",
            "fa": "این هوشمندانه است، شلوغی کمتری دارد.",
            "level": "B1"
          },
          {
            "en": "We'll need to save up for it.",
            "fa": "ما باید برای آن پس‌انداز کنیم.",
            "level": "B2"
          },
          {
            "en": "We should be responsible travelers.",
            "fa": "ما باید مسافران مسئولیت‌پذیری باشیم.",
            "level": "C1"
          },
          {
            "en": "Authentic experiences are the most rewarding.",
            "fa": "تجربه‌های اصیل بیشترین پاداش را دارند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "At the airport",
        "context": "Checking in and asking about flights.",
        "speakerA": [
          {
            "en": "Where is the check-in desk?",
            "fa": "میز ثبت‌نام کجاست؟",
            "level": "A1"
          },
          {
            "en": "What time is my flight?",
            "fa": "پرواز من چه ساعتی است؟",
            "level": "A2"
          },
          {
            "en": "I have a connecting flight.",
            "fa": "من یک پرواز اتصالی دارم.",
            "level": "A2"
          },
          {
            "en": "I need to check my luggage.",
            "fa": "من باید چمدان خود را تحویل بدهم.",
            "level": "B1"
          },
          {
            "en": "Is my flight on time?",
            "fa": "آیا پرواز من به موقع است؟",
            "level": "B1"
          },
          {
            "en": "What gate is the flight boarding from?",
            "fa": "پرواز از کدام گیت سوار می‌شود؟",
            "level": "B2"
          },
          {
            "en": "The security check is quite thorough.",
            "fa": "بازرسی امنیتی بسیار کامل است.",
            "level": "C1"
          },
          {
            "en": "We must comply with all aviation regulations.",
            "fa": "ما باید از تمام مقررات هوانوردی پیروی کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "It's on the second floor.",
            "fa": "در طبقه دوم است.",
            "level": "A1"
          },
          {
            "en": "It departs at 10:30 AM.",
            "fa": "ساعت ۱۰:۳۰ صبح حرکت می‌کند.",
            "level": "A2"
          },
          {
            "en": "Where are you connecting?",
            "fa": "کجا اتصال دارید؟",
            "level": "A2"
          },
          {
            "en": "You can check it in at the counter.",
            "fa": "شما می‌توانید آن را در میز تحویل دهید.",
            "level": "B1"
          },
          {
            "en": "Let me check the board.",
            "fa": "بگذارید تابلو را بررسی کنم.",
            "level": "B1"
          },
          {
            "en": "It's at gate number 15.",
            "fa": "دروازه شماره ۱۵ است.",
            "level": "B2"
          },
          {
            "en": "We need to arrive early to be safe.",
            "fa": "ما باید زود برسیم تا خیالمون راحت باشد.",
            "level": "C1"
          },
          {
            "en": "Safety is always the top priority.",
            "fa": "ایمنی همیشه اولین اولویت است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Visiting historical sites",
        "context": "Exploring museums, castles, and ancient ruins.",
        "speakerA": [
          {
            "en": "This museum is very old.",
            "fa": "این موزه بسیار قدیمی است.",
            "level": "A1"
          },
          {
            "en": "I love seeing ancient buildings.",
            "fa": "من عاشق دیدن ساختمان‌های باستانی هستم.",
            "level": "A2"
          },
          {
            "en": "This castle was built 500 years ago.",
            "fa": "این قلعه ۵۰۰ سال پیش ساخته شده است.",
            "level": "A2"
          },
          {
            "en": "The history here is fascinating.",
            "fa": "تاریخ اینجا جذاب است.",
            "level": "B1"
          },
          {
            "en": "We should take a guided tour.",
            "fa": "ما باید یک تور با راهنما بگیریم.",
            "level": "B1"
          },
          {
            "en": "The architecture reflects the era perfectly.",
            "fa": "معماری به طور کامل منعکس کننده دوران است.",
            "level": "B2"
          },
          {
            "en": "Preservation of these sites is crucial.",
            "fa": "حفاظت از این مکان‌ها بسیار مهم است.",
            "level": "C1"
          },
          {
            "en": "We are walking through living history.",
            "fa": "ما در حال قدم زدن در تاریخ زنده هستیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's very historic.",
            "fa": "بله، بسیار تاریخی است.",
            "level": "A1"
          },
          {
            "en": "They are amazing.",
            "fa": "آنها شگفت‌انگیز هستند.",
            "level": "A2"
          },
          {
            "en": "Wow, that's incredible.",
            "fa": "واو، این باورنکردنی است.",
            "level": "A2"
          },
          {
            "en": "I agree, I could stay here for hours.",
            "fa": "موافقم، می‌توانستم ساعتها اینجا بمانم.",
            "level": "B1"
          },
          {
            "en": "That's a good idea.",
            "fa": "این ایده خوبی است.",
            "level": "B1"
          },
          {
            "en": "The details are stunning.",
            "fa": "جزئیات خیره‌کننده است.",
            "level": "B2"
          },
          {
            "en": "We must protect our cultural heritage.",
            "fa": "ما باید از میراث فرهنگی خود محافظت کنیم.",
            "level": "C1"
          },
          {
            "en": "It's a privilege to witness this.",
            "fa": "این یک امتیاز است که شاهد این باشیم.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "غذا و آشپزی (Food and Cooking)",
    "scenarios": [
      {
        "scenario": "Describing a favorite dish",
        "context": "Talking about a food you love and how it's made.",
        "speakerA": [
          {
            "en": "My favorite food is pizza.",
            "fa": "غذای مورد علاقه من پیتزا است.",
            "level": "A1"
          },
          {
            "en": "I love pasta with cheese.",
            "fa": "من پاستا با پنیر را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "This soup is very tasty.",
            "fa": "این سوپ بسیار خوشمزه است.",
            "level": "A2"
          },
          {
            "en": "I like to add garlic to my dishes.",
            "fa": "من دوست دارم به غذاهایم سیر اضافه کنم.",
            "level": "B1"
          },
          {
            "en": "The secret is in the seasoning.",
            "fa": "راز در چاشنی است.",
            "level": "B1"
          },
          {
            "en": "This recipe has been passed down for generations.",
            "fa": "این دستور غذا برای نسل‌ها منتقل شده است.",
            "level": "B2"
          },
          {
            "en": "Fusion cuisine combines different culinary traditions.",
            "fa": "آشپزی تلفیقی سنت‌های مختلف آشپزی را ترکیب می‌کند.",
            "level": "C1"
          },
          {
            "en": "Gastronomy is an art form in itself.",
            "fa": "علم آشپزی به خودی خود یک هنر است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Me too! It's delicious.",
            "fa": "منم همینطور! خوشمزه است.",
            "level": "A1"
          },
          {
            "en": "I prefer it with tomato sauce.",
            "fa": "من آن را با سس گوجه‌فرنگی ترجیح می‌دهم.",
            "level": "A2"
          },
          {
            "en": "Can I have the recipe?",
            "fa": "می‌توانم دستور پخت را داشته باشم؟",
            "level": "A2"
          },
          {
            "en": "That gives it a great flavor.",
            "fa": "این طعم عالی به آن می‌دهد.",
            "level": "B1"
          },
          {
            "en": "I always use fresh herbs.",
            "fa": "من همیشه از گیاهان تازه استفاده می‌کنم.",
            "level": "B1"
          },
          {
            "en": "That's a wonderful tradition.",
            "fa": "این یک سنت فوق‌العاده است.",
            "level": "B2"
          },
          {
            "en": "It's interesting to see flavors merge.",
            "fa": "دیدن تلفیق طعم‌ها جالب است.",
            "level": "C1"
          },
          {
            "en": "Food is a universal language.",
            "fa": "غذا یک زبان جهانی است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Ordering in a restaurant",
        "context": "Being at a restaurant and ordering a meal.",
        "speakerA": [
          {
            "en": "I would like a hamburger.",
            "fa": "من یک همبرگر می‌خواهم.",
            "level": "A1"
          },
          {
            "en": "Can I have some water, please?",
            "fa": "لطفاً می‌توانم مقداری آب داشته باشم؟",
            "level": "A1"
          },
          {
            "en": "What is the special today?",
            "fa": "غذای ویژه امروز چیست؟",
            "level": "A2"
          },
          {
            "en": "I'm allergic to nuts.",
            "fa": "من به آجیل حساسیت دارم.",
            "level": "B1"
          },
          {
            "en": "Could you recommend a good wine?",
            "fa": "می‌توانید یک شراب خوب پیشنهاد دهید؟",
            "level": "B1"
          },
          {
            "en": "I'd like my steak cooked medium-rare.",
            "fa": "من استیک خود را نسبتاً خوناب می‌خواهم.",
            "level": "B2"
          },
          {
            "en": "The presentation of the food is exquisite.",
            "fa": "ارائه غذا عالی است.",
            "level": "C1"
          },
          {
            "en": "This restaurant has a Michelin star.",
            "fa": "این رستوران یک ستاره میشلن دارد.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I'll have the same.",
            "fa": "من هم همان را می‌خواهم.",
            "level": "A1"
          },
          {
            "en": "Here's your water, sir.",
            "fa": "آب شما، آقا.",
            "level": "A1"
          },
          {
            "en": "We have fish or chicken.",
            "fa": "ما ماهی یا مرغ داریم.",
            "level": "A2"
          },
          {
            "en": "We'll make sure there are no nuts.",
            "fa": "ما مطمئن می‌شویم که آجیل وجود ندارد.",
            "level": "B1"
          },
          {
            "en": "I recommend the Merlot.",
            "fa": "من مرلو را توصیه می‌کنم.",
            "level": "B1"
          },
          {
            "en": "How would you like it cooked?",
            "fa": "چگونه دوست دارید پخته شود؟",
            "level": "B2"
          },
          {
            "en": "It's almost too beautiful to eat.",
            "fa": "تقریباً خیلی زیبا است که بخوریم.",
            "level": "C1"
          },
          {
            "en": "The service here is impeccable.",
            "fa": "سرویس اینجا بی‌نقص است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing dietary preferences",
        "context": "Talking about vegetarian, vegan, or other diets.",
        "speakerA": [
          {
            "en": "I am a vegetarian.",
            "fa": "من گیاهخوار هستم.",
            "level": "A1"
          },
          {
            "en": "I don't eat meat or fish.",
            "fa": "من گوشت یا ماهی نمی‌خورم.",
            "level": "A2"
          },
          {
            "en": "I'm trying to eat less sugar.",
            "fa": "من سعی می‌کنم شکر کمتری بخورم.",
            "level": "A2"
          },
          {
            "en": "I prefer organic food.",
            "fa": "من غذای ارگانیک را ترجیح می‌دهم.",
            "level": "B1"
          },
          {
            "en": "A plant-based diet is very healthy.",
            "fa": "رژیم غذایی مبتنی بر گیاهان بسیار سالم است.",
            "level": "B1"
          },
          {
            "en": "I'm considering going vegan.",
            "fa": "من به گیاهخواری مطلق فکر می‌کنم.",
            "level": "B2"
          },
          {
            "en": "Nutritional science is constantly evolving.",
            "fa": "علم تغذیه دائماً در حال تکامل است.",
            "level": "C1"
          },
          {
            "en": "We must find a sustainable approach to food.",
            "fa": "ما باید رویکردی پایدار برای غذا پیدا کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's very healthy.",
            "fa": "این بسیار سالم است.",
            "level": "A1"
          },
          {
            "en": "I eat fish sometimes.",
            "fa": "من گاهی ماهی می‌خورم.",
            "level": "A2"
          },
          {
            "en": "That's a good goal.",
            "fa": "این یک هدف خوب است.",
            "level": "A2"
          },
          {
            "en": "It is better for the environment.",
            "fa": "برای محیط زیست بهتر است.",
            "level": "B1"
          },
          {
            "en": "I've read a lot about it.",
            "fa": "چیزهای زیادی درباره‌اش خوانده‌ام.",
            "level": "B1"
          },
          {
            "en": "It takes commitment.",
            "fa": "این نیاز به تعهد دارد.",
            "level": "B2"
          },
          {
            "en": "The field is very dynamic.",
            "fa": "این حوزه بسیار پویا است.",
            "level": "C1"
          },
          {
            "en": "Food choices affect our planet.",
            "fa": "انتخاب‌های غذایی بر سیاره ما تأثیر می‌گذارد.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "جنگ و درگیری (War and Conflict)",
    "scenarios": [
      {
        "scenario": "Discussing the impact of war",
        "context": "Two people talk about the consequences of armed conflict.",
        "speakerA": [
          {
            "en": "War is terrible.",
            "fa": "جنگ وحشتناک است.",
            "level": "A1"
          },
          {
            "en": "Many people are suffering.",
            "fa": "بسیاری از مردم در رنج هستند.",
            "level": "A2"
          },
          {
            "en": "There are refugees from the war.",
            "fa": "پناهندگان جنگی وجود دارند.",
            "level": "A2"
          },
          {
            "en": "The conflict has destroyed many cities.",
            "fa": "درگیری بسیاری از شهرها را ویران کرده است.",
            "level": "B1"
          },
          {
            "en": "I hope they find a peaceful solution.",
            "fa": "امیدوارم راه حل صلح‌آمیزی پیدا کنند.",
            "level": "B1"
          },
          {
            "en": "The humanitarian crisis is escalating.",
            "fa": "بحران انسانی در حال تشدید است.",
            "level": "B2"
          },
          {
            "en": "We must advocate for conflict resolution.",
            "fa": "ما باید از حل و فصل مناقشه حمایت کنیم.",
            "level": "C1"
          },
          {
            "en": "The geopolitical consequences are far-reaching.",
            "fa": "پیامدهای ژئوپلیتیکی بسیار گسترده است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I agree completely.",
            "fa": "من کاملاً موافقم.",
            "level": "A1"
          },
          {
            "en": "It's very sad to see.",
            "fa": "دیدنش بسیار غم‌انگیز است.",
            "level": "A2"
          },
          {
            "en": "We need to help them.",
            "fa": "ما باید به آنها کمک کنیم.",
            "level": "A2"
          },
          {
            "en": "The damage is unimaginable.",
            "fa": "خسارت غیرقابل تصور است.",
            "level": "B1"
          },
          {
            "en": "Me too. Peace is the only way.",
            "fa": "منم همینطور. صلح تنها راه است.",
            "level": "B1"
          },
          {
            "en": "International aid is essential.",
            "fa": "کمک‌های بین‌المللی ضروری است.",
            "level": "B2"
          },
          {
            "en": "Diplomacy is always preferable to violence.",
            "fa": "دیپلماسی همیشه بر خشونت ترجیح دارد.",
            "level": "C1"
          },
          {
            "en": "The cycle of violence must be broken.",
            "fa": "چرخه خشونت باید شکسته شود.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about peace efforts",
        "context": "Discussing negotiations and peace agreements.",
        "speakerA": [
          {
            "en": "They signed a peace treaty.",
            "fa": "آنها یک معاهده صلح امضا کردند.",
            "level": "A2"
          },
          {
            "en": "The negotiations are ongoing.",
            "fa": "مذاکرات در حال انجام است.",
            "level": "A2"
          },
          {
            "en": "I hope the ceasefire holds.",
            "fa": "امیدوارم آتش‌بس برقرار بماند.",
            "level": "B1"
          },
          {
            "en": "Peace talks are a positive step.",
            "fa": "گفتگوهای صلح یک گام مثبت است.",
            "level": "B1"
          },
          {
            "en": "UN peacekeepers are monitoring the situation.",
            "fa": "صلح‌بانان سازمان ملل در حال نظارت بر وضعیت هستند.",
            "level": "B2"
          },
          {
            "en": "Sustainable peace requires justice.",
            "fa": "صلح پایدار نیاز به عدالت دارد.",
            "level": "C1"
          },
          {
            "en": "Reconciliation is the ultimate goal.",
            "fa": "آشتی هدف نهایی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's great news!",
            "fa": "این خبر عالی است!",
            "level": "A2"
          },
          {
            "en": "I hope they make progress.",
            "fa": "امیدوارم پیشرفت کنند.",
            "level": "A2"
          },
          {
            "en": "We all want peace.",
            "fa": "همه ما صلح می‌خواهیم.",
            "level": "B1"
          },
          {
            "en": "Better than fighting.",
            "fa": "بهتر از جنگیدن است.",
            "level": "B1"
          },
          {
            "en": "That's reassuring.",
            "fa": "این اطمینان‌بخش است.",
            "level": "B2"
          },
          {
            "en": "Truth and reconciliation are vital.",
            "fa": "حقیقت و آشتی حیاتی هستند.",
            "level": "C1"
          },
          {
            "en": "It's a difficult but necessary path.",
            "fa": "این مسیری دشوار اما ضروری است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "شغل (Work)",
    "scenarios": [
      {
        "scenario": "Talking about your job",
        "context": "Two people discuss their professions and daily work.",
        "speakerA": [
          {
            "en": "I am a teacher.",
            "fa": "من یک معلم هستم.",
            "level": "A1"
          },
          {
            "en": "I work in an office.",
            "fa": "من در یک دفتر کار می‌کنم.",
            "level": "A2"
          },
          {
            "en": "My job is very busy.",
            "fa": "شغل من بسیار شلوغ است.",
            "level": "A2"
          },
          {
            "en": "I enjoy my work.",
            "fa": "من از کارم لذت می‌برم.",
            "level": "B1"
          },
          {
            "en": "I have to meet deadlines.",
            "fa": "من باید ضرب‌الاجل‌ها را رعایت کنم.",
            "level": "B1"
          },
          {
            "en": "I'm looking for a new career opportunity.",
            "fa": "من به دنبال یک فرصت شغلی جدید هستم.",
            "level": "B2"
          },
          {
            "en": "Work-life balance is essential.",
            "fa": "تعادل کار و زندگی ضروری است.",
            "level": "C1"
          },
          {
            "en": "Professional development is a lifelong pursuit.",
            "fa": "توسعه حرفه‌ای یک تلاش مادام‌العمر است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a great profession.",
            "fa": "این حرفه فوق‌العاده‌ای است.",
            "level": "A1"
          },
          {
            "en": "What do you do there?",
            "fa": "آنجا چه کار می‌کنی؟",
            "level": "A2"
          },
          {
            "en": "I can imagine it's stressful.",
            "fa": "می‌توانم تصور کنم استرس‌زا باشد.",
            "level": "A2"
          },
          {
            "en": "That's wonderful!",
            "fa": "این فوق‌العاده است!",
            "level": "B1"
          },
          {
            "en": "That's tough, I understand.",
            "fa": "این سخت است، می‌فهمم.",
            "level": "B1"
          },
          {
            "en": "I wish you the best of luck.",
            "fa": "برایت بهترین‌ها را آرزو می‌کنم.",
            "level": "B2"
          },
          {
            "en": "I couldn't agree more.",
            "fa": "کاملاً موافقم.",
            "level": "C1"
          },
          {
            "en": "It's key to long-term success.",
            "fa": "این کلید موفقیت بلندمدت است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing workplace challenges",
        "context": "Talking about difficulties at work.",
        "speakerA": [
          {
            "en": "My boss is very strict.",
            "fa": "رئیس من بسیار سخت‌گیر است.",
            "level": "A2"
          },
          {
            "en": "I have too much work.",
            "fa": "من بیش از حد کار دارم.",
            "level": "A2"
          },
          {
            "en": "I feel stressed at work.",
            "fa": "من در محل کار احساس استرس می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I need a break from this project.",
            "fa": "من نیاز به استراحت از این پروژه دارم.",
            "level": "B1"
          },
          {
            "en": "I'm dealing with a difficult colleague.",
            "fa": "من با یک همکار دشوار سر و کار دارم.",
            "level": "B2"
          },
          {
            "en": "Burnout is a real problem.",
            "fa": "فرسودگی شغلی یک مشکل واقعی است.",
            "level": "C1"
          },
          {
            "en": "We need to foster a healthier work environment.",
            "fa": "ما باید محیط کار سالم‌تری ایجاد کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I understand the pressure.",
            "fa": "فشار را درک می‌کنم.",
            "level": "A2"
          },
          {
            "en": "You should talk to your manager.",
            "fa": "تو باید با مدیر خود صحبت کنی.",
            "level": "A2"
          },
          {
            "en": "Maybe you need a vacation.",
            "fa": "شاید به تعطیلات نیاز داشته باشی.",
            "level": "B1"
          },
          {
            "en": "You deserve some time off.",
            "fa": "تو شایسته چند روز مرخصی هستی.",
            "level": "B1"
          },
          {
            "en": "That sounds challenging.",
            "fa": "به نظر چالش‌برانگیز می‌رسد.",
            "level": "B2"
          },
          {
            "en": "Self-care is important.",
            "fa": "مراقبت از خود مهم است.",
            "level": "C1"
          },
          {
            "en": "It's a shared responsibility.",
            "fa": "این یک مسئولیت مشترک است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "شخصیت (Personality)",
    "scenarios": [
      {
        "scenario": "Describing personality traits",
        "context": "People talk about their own or others' character.",
        "speakerA": [
          {
            "en": "I am a friendly person.",
            "fa": "من یک فرد خوش‌برخورد هستم.",
            "level": "A1"
          },
          {
            "en": "My brother is very funny.",
            "fa": "برادرم بسیار بامزه است.",
            "level": "A2"
          },
          {
            "en": "She is very kind and caring.",
            "fa": "او بسیار مهربان و دلسوز است.",
            "level": "A2"
          },
          {
            "en": "I think I'm quite patient.",
            "fa": "فکر می‌کنم نسبتاً صبور هستم.",
            "level": "B1"
          },
          {
            "en": "I'm an introverted person.",
            "fa": "من یک فرد درون‌گرا هستم.",
            "level": "B1"
          },
          {
            "en": "He has a very optimistic outlook.",
            "fa": "او دیدگاه بسیار خوش‌بینانه‌ای دارد.",
            "level": "B2"
          },
          {
            "en": "Resilience is an admirable trait.",
            "fa": "تاب‌آوری یک ویژگی ستودنی است.",
            "level": "C1"
          },
          {
            "en": "Empathy is essential for human connection.",
            "fa": "همدلی برای ارتباط انسانی ضروری است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a nice quality.",
            "fa": "این یک ویژگی خوب است.",
            "level": "A1"
          },
          {
            "en": "He sounds like a great person.",
            "fa": "به نظر یک فرد عالی می‌رسد.",
            "level": "A2"
          },
          {
            "en": "That's wonderful.",
            "fa": "این فوق‌العاده است.",
            "level": "A2"
          },
          {
            "en": "Patience is a virtue.",
            "fa": "صبر یک فضیلت است.",
            "level": "B1"
          },
          {
            "en": "I can be shy sometimes too.",
            "fa": "من هم گاهی می‌توانم خجالتی باشم.",
            "level": "B1"
          },
          {
            "en": "That's a great way to live.",
            "fa": "این یک روش عالی برای زندگی است.",
            "level": "B2"
          },
          {
            "en": "We should all aspire to that.",
            "fa": "همه ما باید به آن aspire کنیم.",
            "level": "C1"
          },
          {
            "en": "It builds stronger communities.",
            "fa": "این جوامع قوی‌تری می‌سازد.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about strengths and weaknesses",
        "context": "Discussing personal qualities and areas for improvement.",
        "speakerA": [
          {
            "en": "I am good at drawing.",
            "fa": "من در نقاشی خوب هستم.",
            "level": "A1"
          },
          {
            "en": "I need to improve my English.",
            "fa": "من باید انگلیسی خود را بهبود بخشم.",
            "level": "A2"
          },
          {
            "en": "My strength is problem-solving.",
            "fa": "نقطه قوت من حل مسئله است.",
            "level": "B1"
          },
          {
            "en": "I'm not very organized.",
            "fa": "من خیلی منظم نیستم.",
            "level": "B1"
          },
          {
            "en": "I always try to learn from my mistakes.",
            "fa": "من همیشه سعی می‌کنم از اشتباهاتم یاد بگیرم.",
            "level": "B2"
          },
          {
            "en": "Self-awareness is the first step.",
            "fa": "خودآگاهی اولین قدم است.",
            "level": "C1"
          },
          {
            "en": "Continuous self-improvement is a journey.",
            "fa": "خودسازی مستمر یک سفر است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a great talent.",
            "fa": "این یک استعداد عالی است.",
            "level": "A1"
          },
          {
            "en": "Practice will help.",
            "fa": "تمرین کمک خواهد کرد.",
            "level": "A2"
          },
          {
            "en": "That's very valuable.",
            "fa": "این بسیار ارزشمند است.",
            "level": "B1"
          },
          {
            "en": "You can use apps to help.",
            "fa": "می‌توانی از برنامه‌ها برای کمک استفاده کنی.",
            "level": "B1"
          },
          {
            "en": "That's a growth mindset.",
            "fa": "این یک ذهنیت رشد است.",
            "level": "B2"
          },
          {
            "en": "It's the foundation of development.",
            "fa": "این پایه و اساس توسعه است.",
            "level": "C1"
          },
          {
            "en": "Every day is a new opportunity.",
            "fa": "هر روز یک فرصت جدید است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "بدن انسان (Body)",
    "scenarios": [
      {
        "scenario": "Talking about physical health",
        "context": "Discussing health, exercise, and the body.",
        "speakerA": [
          {
            "en": "I have a headache.",
            "fa": "من سردرد دارم.",
            "level": "A1"
          },
          {
            "en": "My leg hurts.",
            "fa": "پای من درد می‌کند.",
            "level": "A2"
          },
          {
            "en": "I need to exercise more.",
            "fa": "من باید بیشتر ورزش کنم.",
            "level": "A2"
          },
          {
            "en": "Eating healthy is good for the body.",
            "fa": "خوردن غذای سالم برای بدن مفید است.",
            "level": "B1"
          },
          {
            "en": "I try to stay fit.",
            "fa": "من سعی می‌کنم تناسب اندام خود را حفظ کنم.",
            "level": "B1"
          },
          {
            "en": "Physical activity improves mental health.",
            "fa": "فعالیت بدنی سلامت روان را بهبود می‌بخشد.",
            "level": "B2"
          },
          {
            "en": "We need to listen to our bodies.",
            "fa": "ما باید به بدن خود گوش دهیم.",
            "level": "C1"
          },
          {
            "en": "Holistic wellness is the ultimate goal.",
            "fa": "سلامت کل‌نگر هدف نهایی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Take some medicine.",
            "fa": "مقداری دارو بخور.",
            "level": "A1"
          },
          {
            "en": "Maybe you should see a doctor.",
            "fa": "شاید باید به پزشک مراجعه کنی.",
            "level": "A2"
          },
          {
            "en": "It's important for health.",
            "fa": "برای سلامتی مهم است.",
            "level": "A2"
          },
          {
            "en": "I completely agree.",
            "fa": "کاملاً موافقم.",
            "level": "B1"
          },
          {
            "en": "I try to work out three times a week.",
            "fa": "من سعی می‌کنم هفته‌ای سه بار تمرین کنم.",
            "level": "B1"
          },
          {
            "en": "There's a clear connection.",
            "fa": "ارتباط واضحی وجود دارد.",
            "level": "B2"
          },
          {
            "en": "It's important to rest when needed.",
            "fa": "استراحت در صورت نیاز مهم است.",
            "level": "C1"
          },
          {
            "en": "Balance is key to longevity.",
            "fa": "تعادل کلید طول عمر است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about physical appearance",
        "context": "People discuss how they or others look.",
        "speakerA": [
          {
            "en": "You look nice today.",
            "fa": "امروز خوب به نظر می‌رسی.",
            "level": "A1"
          },
          {
            "en": "She is very tall.",
            "fa": "او بسیار قد بلند است.",
            "level": "A2"
          },
          {
            "en": "I have brown hair.",
            "fa": "من موهای قهوه‌ای دارم.",
            "level": "A2"
          },
          {
            "en": "He has blue eyes.",
            "fa": "او چشم‌های آبی دارد.",
            "level": "B1"
          },
          {
            "en": "I've lost some weight recently.",
            "fa": "من اخیراً مقداری وزن کم کرده‌ام.",
            "level": "B1"
          },
          {
            "en": "Beauty standards vary across cultures.",
            "fa": "استانداردهای زیبایی در فرهنگ‌های مختلف متفاوت است.",
            "level": "B2"
          },
          {
            "en": "We should value diversity in appearance.",
            "fa": "ما باید تنوع در ظاهر را ارزش بگذاریم.",
            "level": "C1"
          },
          {
            "en": "Inner beauty is ultimately what matters.",
            "fa": "زیبایی درونی در نهایت مهم است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Thank you!",
            "fa": "متشکرم!",
            "level": "A1"
          },
          {
            "en": "She must be good at basketball.",
            "fa": "او باید در بسکتبال خوب باشد.",
            "level": "A2"
          },
          {
            "en": "That's a nice color.",
            "fa": "این رنگ خوبی است.",
            "level": "A2"
          },
          {
            "en": "That's a beautiful eye color.",
            "fa": "این رنگ چشم زیبایی است.",
            "level": "B1"
          },
          {
            "en": "You look great!",
            "fa": "عالی به نظر می‌رسی!",
            "level": "B1"
          },
          {
            "en": "That's an interesting observation.",
            "fa": "این یک مشاهده جالب است.",
            "level": "B2"
          },
          {
            "en": "It's what's on the inside that counts.",
            "fa": "چیزی که درون است اهمیت دارد.",
            "level": "C1"
          },
          {
            "en": "It's a timeless truth.",
            "fa": "این یک حقیقت جاودانه است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "کسب و کار (Business)",
    "scenarios": [
      {
        "scenario": "Starting a business",
        "context": "Two people talk about entrepreneurship.",
        "speakerA": [
          {
            "en": "I want to start a business.",
            "fa": "من می‌خواهم یک کسب و کار راه‌اندازی کنم.",
            "level": "A2"
          },
          {
            "en": "I need to write a business plan.",
            "fa": "من باید یک طرح کسب و کار بنویسم.",
            "level": "A2"
          },
          {
            "en": "I will open a coffee shop.",
            "fa": "من یک کافه باز خواهم کرد.",
            "level": "B1"
          },
          {
            "en": "Small businesses are the economy's backbone.",
            "fa": "کسب و کارهای کوچک ستون فقرات اقتصاد هستند.",
            "level": "B1"
          },
          {
            "en": "I'm looking for investors.",
            "fa": "من به دنبال سرمایه‌گذار هستم.",
            "level": "B2"
          },
          {
            "en": "Market research is crucial.",
            "fa": "تحقیقات بازار بسیار مهم است.",
            "level": "C1"
          },
          {
            "en": "Entrepreneurship is about taking calculated risks.",
            "fa": "کارآفرینی به معنای ریسک‌های حساب‌شده است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a great idea.",
            "fa": "این ایده خوبی است.",
            "level": "A2"
          },
          {
            "en": "I can help you with that.",
            "fa": "من می‌توانم در آن به شما کمک کنم.",
            "level": "A2"
          },
          {
            "en": "That's very exciting!",
            "fa": "این بسیار هیجان‌انگیز است!",
            "level": "B1"
          },
          {
            "en": "I couldn't agree more.",
            "fa": "کاملاً موافقم.",
            "level": "B1"
          },
          {
            "en": "I hope you find the support you need.",
            "fa": "امیدوارم حمایت مورد نیاز خود را پیدا کنی.",
            "level": "B2"
          },
          {
            "en": "It reduces the risk of failure.",
            "fa": "این خطر شکست را کاهش می‌دهد.",
            "level": "C1"
          },
          {
            "en": "It's a constant learning experience.",
            "fa": "این یک تجربه یادگیری مداوم است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing corporate culture",
        "context": "Talking about working in large companies.",
        "speakerA": [
          {
            "en": "I work for a big company.",
            "fa": "من برای یک شرکت بزرگ کار می‌کنم.",
            "level": "A1"
          },
          {
            "en": "My company has many employees.",
            "fa": "شرکت من کارمندان زیادی دارد.",
            "level": "A2"
          },
          {
            "en": "I go to meetings every day.",
            "fa": "من هر روز به جلسات می‌روم.",
            "level": "B1"
          },
          {
            "en": "Corporate culture is very important.",
            "fa": "فرهنگ سازمانی بسیار مهم است.",
            "level": "B1"
          },
          {
            "en": "I'm looking for a more flexible work environment.",
            "fa": "من به دنبال یک محیط کار انعطاف‌پذیرتر هستم.",
            "level": "B2"
          },
          {
            "en": "Leadership needs to inspire trust.",
            "fa": "رهبری باید اعتماد را الهام بخشد.",
            "level": "C1"
          },
          {
            "en": "Organizational ethics are fundamental.",
            "fa": "اخلاق سازمانی اساسی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Is it a good company?",
            "fa": "آیا شرکت خوبی است؟",
            "level": "A1"
          },
          {
            "en": "Is it a big office?",
            "fa": "دفتر بزرگی دارد؟",
            "level": "A2"
          },
          {
            "en": "That sounds busy.",
            "fa": "به نظر شلوغ می‌رسد.",
            "level": "B1"
          },
          {
            "en": "A positive culture makes a big difference.",
            "fa": "یک فرهنگ مثبت تفاوت زیادی ایجاد می‌کند.",
            "level": "B1"
          },
          {
            "en": "Remote work is becoming more common.",
            "fa": "کار از راه دور در حال رایج‌تر شدن است.",
            "level": "B2"
          },
          {
            "en": "It's a two-way relationship.",
            "fa": "این یک رابطه دو طرفه است.",
            "level": "C1"
          },
          {
            "en": "They should align with long-term goals.",
            "fa": "آنها باید با اهداف بلندمدت همخوانی داشته باشند.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "لباس و مد (Clothes and Fashion)",
    "scenarios": [
      {
        "scenario": "Discussing fashion choices",
        "context": "Talking about clothes, trends, and personal style.",
        "speakerA": [
          {
            "en": "I like this dress.",
            "fa": "من این لباس را دوست دارم.",
            "level": "A1"
          },
          {
            "en": "I wear jeans every day.",
            "fa": "من هر روز شلوار جین می‌پوشم.",
            "level": "A2"
          },
          {
            "en": "I need to buy new shoes.",
            "fa": "من باید کفش جدید بخرم.",
            "level": "A2"
          },
          {
            "en": "I prefer comfortable clothes.",
            "fa": "من لباس‌های راحت را ترجیح می‌دهم.",
            "level": "B1"
          },
          {
            "en": "Fashion trends change quickly.",
            "fa": "ترندهای مد به سرعت تغییر می‌کنند.",
            "level": "B1"
          },
          {
            "en": "I like minimal and classic styles.",
            "fa": "من سبک‌های مینیمال و کلاسیک را دوست دارم.",
            "level": "B2"
          },
          {
            "en": "Fast fashion has environmental costs.",
            "fa": "مد سریع هزینه‌های زیست‌محیطی دارد.",
            "level": "C1"
          },
          {
            "en": "Fashion is a form of self-expression.",
            "fa": "مد نوعی بیان خود است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's very stylish.",
            "fa": "بله، بسیار شیک است.",
            "level": "A1"
          },
          {
            "en": "They are very practical.",
            "fa": "آنها بسیار کاربردی هستند.",
            "level": "A2"
          },
          {
            "en": "Where do you like to shop?",
            "fa": "کجا خرید کردن را دوست داری؟",
            "level": "A2"
          },
          {
            "en": "Comfort is key for me too.",
            "fa": "راحتی برای من هم کلیدی است.",
            "level": "B1"
          },
          {
            "en": "It's hard to keep up.",
            "fa": "همگام شدن با آن سخت است.",
            "level": "B1"
          },
          {
            "en": "That's a timeless approach.",
            "fa": "این یک رویکرد جاودانه است.",
            "level": "B2"
          },
          {
            "en": "We should support sustainable brands.",
            "fa": "ما باید از برندهای پایدار حمایت کنیم.",
            "level": "C1"
          },
          {
            "en": "It truly reflects personality.",
            "fa": "این واقعاً شخصیت را منعکس می‌کند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Shopping for clothes",
        "context": "At a store, looking for outfits.",
        "speakerA": [
          {
            "en": "Can I try this on?",
            "fa": "می‌توانم این را پرو کنم؟",
            "level": "A1"
          },
          {
            "en": "Do you have this in red?",
            "fa": "این را به رنگ قرمز دارید؟",
            "level": "A2"
          },
          {
            "en": "This size is too small.",
            "fa": "این سایز خیلی کوچک است.",
            "level": "A2"
          },
          {
            "en": "I need a larger size.",
            "fa": "من سایز بزرگ‌تری نیاز دارم.",
            "level": "B1"
          },
          {
            "en": "This material is high quality.",
            "fa": "این جنس کیفیت بالایی دارد.",
            "level": "B1"
          },
          {
            "en": "I'm looking for a formal outfit.",
            "fa": "من به دنبال یک لباس رسمی هستم.",
            "level": "B2"
          },
          {
            "en": "The stitching is very precise.",
            "fa": "دوخت بسیار دقیق است.",
            "level": "C1"
          },
          {
            "en": "This design is quite unique.",
            "fa": "این طراحی نسبتاً منحصر به فرد است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "The changing rooms are over there.",
            "fa": "اتاق‌های پرو آنجا هستند.",
            "level": "A1"
          },
          {
            "en": "Let me check our stock.",
            "fa": "بگذارید موجودی را بررسی کنم.",
            "level": "A2"
          },
          {
            "en": "I'll get you the next size.",
            "fa": "سایز بعدی را برای شما می‌آورم.",
            "level": "A2"
          },
          {
            "en": "We have it in other colors too.",
            "fa": "ما آن را در رنگ‌های دیگر هم داریم.",
            "level": "B1"
          },
          {
            "en": "It's very durable fabric.",
            "fa": "پارچه بسیار بادوام است.",
            "level": "B1"
          },
          {
            "en": "This section is for formal wear.",
            "fa": "این بخش برای پوشاک رسمی است.",
            "level": "B2"
          },
          {
            "en": "It's a well-crafted garment.",
            "fa": "این یک لباس باکیفیت است.",
            "level": "C1"
          },
          {
            "en": "It's a limited edition piece.",
            "fa": "این یک قطعه نسخه محدود است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "جرم و قانون (Crime and Law)",
    "scenarios": [
      {
        "scenario": "Discussing crime prevention",
        "context": "Talking about safety and reducing crime.",
        "speakerA": [
          {
            "en": "There is a lot of crime here.",
            "fa": "اینجا جرم و جنایت زیادی وجود دارد.",
            "level": "A1"
          },
          {
            "en": "I am afraid to walk alone at night.",
            "fa": "من از شب‌ها تنها راه رفتن می‌ترسم.",
            "level": "A2"
          },
          {
            "en": "We should install security cameras.",
            "fa": "ما باید دوربین‌های امنیتی نصب کنیم.",
            "level": "A2"
          },
          {
            "en": "Community policing helps reduce crime.",
            "fa": "پلیس محلی به کاهش جرم کمک می‌کند.",
            "level": "B1"
          },
          {
            "en": "Crime prevention starts with education.",
            "fa": "پیشگیری از جرم با آموزش شروع می‌شود.",
            "level": "B1"
          },
          {
            "en": "Rehabilitation is better than punishment.",
            "fa": "بازپروری بهتر از تنبیه است.",
            "level": "B2"
          },
          {
            "en": "We need to address the root causes of crime.",
            "fa": "ما باید به ریشه‌های جرم بپردازیم.",
            "level": "C1"
          },
          {
            "en": "The justice system must be reformed.",
            "fa": "سیستم قضایی باید اصلاح شود.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "It's very concerning.",
            "fa": "این بسیار نگران‌کننده است.",
            "level": "A1"
          },
          {
            "en": "Maybe you should walk with a friend.",
            "fa": "شاید باید با یک دوست راه بروی.",
            "level": "A2"
          },
          {
            "en": "That's a good idea.",
            "fa": "این ایده خوبی است.",
            "level": "A2"
          },
          {
            "en": "I support that approach.",
            "fa": "من از این رویکرد حمایت می‌کنم.",
            "level": "B1"
          },
          {
            "en": "Social programs are important.",
            "fa": "برنامه‌های اجتماعی مهم هستند.",
            "level": "B1"
          },
          {
            "en": "Rehabilitation works if implemented well.",
            "fa": "بازپروری اگر به خوبی اجرا شود کار می‌کند.",
            "level": "B2"
          },
          {
            "en": "Socioeconomic factors play a big role.",
            "fa": "عوامل اجتماعی-اقتصادی نقش بزرگی دارند.",
            "level": "C1"
          },
          {
            "en": "It's a complex societal challenge.",
            "fa": "این یک چالش پیچیده اجتماعی است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Reporting a crime",
        "context": "Someone has witnessed or been a victim of a crime.",
        "speakerA": [
          {
            "en": "I want to report a theft.",
            "fa": "من می‌خواهم یک سرقت را گزارش کنم.",
            "level": "A2"
          },
          {
            "en": "My wallet was stolen.",
            "fa": "کیف پولم دزدیده شد.",
            "level": "A2"
          },
          {
            "en": "I need to speak to the police.",
            "fa": "من باید با پلیس صحبت کنم.",
            "level": "B1"
          },
          {
            "en": "The car was parked on the street.",
            "fa": "ماشین در خیابان پارک شده بود.",
            "level": "B1"
          },
          {
            "en": "I saw the incident happen.",
            "fa": "من حادثه را دیدم که اتفاق افتاد.",
            "level": "B2"
          },
          {
            "en": "I can identify the suspect.",
            "fa": "من می‌توانم مظنون را شناسایی کنم.",
            "level": "C1"
          },
          {
            "en": "I'm willing to testify in court.",
            "fa": "من آماده هستم در دادگاه شهادت دهم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Please sit down and tell us what happened.",
            "fa": "لطفاً بنشینید و به ما بگویید چه اتفاقی افتاده است.",
            "level": "A2"
          },
          {
            "en": "We need a description of the thief.",
            "fa": "ما به توضیحی از دزد نیاز داریم.",
            "level": "A2"
          },
          {
            "en": "We'll take a statement from you.",
            "fa": "ما از شما یک اظهارنامه می‌گیریم.",
            "level": "B1"
          },
          {
            "en": "Please check your belongings carefully.",
            "fa": "لطفاً وسایل خود را به دقت بررسی کنید.",
            "level": "B1"
          },
          {
            "en": "Your testimony will help our investigation.",
            "fa": "شهادت شما به تحقیقات ما کمک خواهد کرد.",
            "level": "B2"
          },
          {
            "en": "We may need you to look at a lineup.",
            "fa": "ممکن است از شما بخواهیم به یک صف نگاه کنید.",
            "level": "C1"
          },
          {
            "en": "The court will consider your evidence.",
            "fa": "دادگاه شواهد شما را بررسی خواهد کرد.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "فرهنگ (Culture)",
    "scenarios": [
      {
        "scenario": "Discussing cultural differences",
        "context": "Talking about traditions and customs from different countries.",
        "speakerA": [
          {
            "en": "Every country has different customs.",
            "fa": "هر کشوری آداب و رسوم متفاوتی دارد.",
            "level": "A1"
          },
          {
            "en": "My culture has many traditions.",
            "fa": "فرهنگ من سنت‌های زیادی دارد.",
            "level": "A2"
          },
          {
            "en": "I love learning about other cultures.",
            "fa": "من عاشق یادگیری درباره فرهنگ‌های دیگر هستم.",
            "level": "A2"
          },
          {
            "en": "Culture is passed down through generations.",
            "fa": "فرهنگ از طریق نسل‌ها منتقل می‌شود.",
            "level": "B1"
          },
          {
            "en": "We should respect different cultural practices.",
            "fa": "ما باید به شیوه‌های فرهنگی مختلف احترام بگذاریم.",
            "level": "B1"
          },
          {
            "en": "Globalization is affecting local cultures.",
            "fa": "جهانی‌سازی بر فرهنگ‌های محلی تأثیر می‌گذارد.",
            "level": "B2"
          },
          {
            "en": "Cultural preservation is essential for diversity.",
            "fa": "حفظ فرهنگ برای تنوع ضروری است.",
            "level": "C1"
          },
          {
            "en": "Culture is the identity of a people.",
            "fa": "فرهنگ هویت یک قوم است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Yes, it's very interesting.",
            "fa": "بله، بسیار جالب است.",
            "level": "A1"
          },
          {
            "en": "What traditions do you have?",
            "fa": "شما چه سنت‌هایی دارید؟",
            "level": "A2"
          },
          {
            "en": "Me too, it's so enriching.",
            "fa": "منم همینطور، بسیار غنی‌کننده است.",
            "level": "A2"
          },
          {
            "en": "It's important to keep them alive.",
            "fa": "مهم است که آنها را زنده نگه داریم.",
            "level": "B1"
          },
          {
            "en": "Respect is the foundation of understanding.",
            "fa": "احترام پایه و اساس درک است.",
            "level": "B1"
          },
          {
            "en": "We need to find a balance.",
            "fa": "ما باید تعادل پیدا کنیم.",
            "level": "B2"
          },
          {
            "en": "We must celebrate our differences.",
            "fa": "ما باید تفاوت‌های خود را جشن بگیریم.",
            "level": "C1"
          },
          {
            "en": "It's what makes the world beautiful.",
            "fa": "این چیزی است که جهان را زیبا می‌کند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Celebrating a traditional festival",
        "context": "Talking about holidays and celebrations.",
        "speakerA": [
          {
            "en": "I love celebrating Nowruz.",
            "fa": "من عاشق جشن گرفتن نوروز هستم.",
            "level": "A2"
          },
          {
            "en": "Christmas is my favorite holiday.",
            "fa": "کریسمس تعطیلات مورد علاقه من است.",
            "level": "A2"
          },
          {
            "en": "We gather with family for Eid.",
            "fa": "ما برای عید با خانواده جمع می‌شویم.",
            "level": "B1"
          },
          {
            "en": "The food is special during this festival.",
            "fa": "غذا در این جشن خاص است.",
            "level": "B1"
          },
          {
            "en": "We wear traditional clothes for celebrations.",
            "fa": "ما برای جشن‌ها لباس سنتی می‌پوشیم.",
            "level": "B2"
          },
          {
            "en": "These festivals strengthen community bonds.",
            "fa": "این جشن‌ها پیوندهای جامعه را تقویت می‌کنند.",
            "level": "C1"
          },
          {
            "en": "Cultural rituals have deep meaning.",
            "fa": "آیین‌های فرهنگی معنای عمیقی دارند.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's wonderful!",
            "fa": "این فوق‌العاده است!",
            "level": "A2"
          },
          {
            "en": "I love the festivities.",
            "fa": "من جشن‌ها را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "Family gatherings are the best.",
            "fa": "دورهمی‌های خانوادگی بهترین هستند.",
            "level": "B1"
          },
          {
            "en": "Food is always important.",
            "fa": "غذا همیشه مهم است.",
            "level": "B1"
          },
          {
            "en": "It's nice to keep traditions alive.",
            "fa": "خوب است که سنت‌ها را زنده نگه داریم.",
            "level": "B2"
          },
          {
            "en": "They bring people together.",
            "fa": "آنها مردم را دور هم جمع می‌کنند.",
            "level": "C1"
          },
          {
            "en": "It's a beautiful expression of identity.",
            "fa": "این یک بیان زیبا از هویت است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "آموزش و تحصیل (Education)",
    "scenarios": [
      {
        "scenario": "Discussing school subjects",
        "context": "Students talk about their classes and subjects.",
        "speakerA": [
          {
            "en": "I like math class.",
            "fa": "من کلاس ریاضی را دوست دارم.",
            "level": "A1"
          },
          {
            "en": "I study science and history.",
            "fa": "من علوم و تاریخ می‌خوانم.",
            "level": "A2"
          },
          {
            "en": "English is my favorite subject.",
            "fa": "انگلیسی درس مورد علاقه من است.",
            "level": "A2"
          },
          {
            "en": "I have a lot of homework tonight.",
            "fa": "امشب تکالیف زیادی دارم.",
            "level": "B1"
          },
          {
            "en": "Exams are coming soon.",
            "fa": "امتحانات به زودی فرا می‌رسند.",
            "level": "B1"
          },
          {
            "en": "Critical thinking is essential in education.",
            "fa": "تفکر انتقادی در آموزش ضروری است.",
            "level": "B2"
          },
          {
            "en": "Education should encourage creativity.",
            "fa": "آموزش باید خلاقیت را تشویق کند.",
            "level": "C1"
          },
          {
            "en": "Lifelong learning is fundamental.",
            "fa": "یادگیری مادام‌العمر اساسی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I like it too.",
            "fa": "من هم آن را دوست دارم.",
            "level": "A1"
          },
          {
            "en": "Those are very interesting.",
            "fa": "آنها بسیار جالب هستند.",
            "level": "A2"
          },
          {
            "en": "I prefer history.",
            "fa": "من تاریخ را ترجیح می‌دهم.",
            "level": "A2"
          },
          {
            "en": "That's a lot of work.",
            "fa": "این کار زیادی است.",
            "level": "B1"
          },
          {
            "en": "I need to study more.",
            "fa": "من باید بیشتر مطالعه کنم.",
            "level": "B1"
          },
          {
            "en": "It empowers students.",
            "fa": "این دانش‌آموزان را توانمند می‌کند.",
            "level": "B2"
          },
          {
            "en": "We need to reform the system.",
            "fa": "ما باید سیستم را اصلاح کنیم.",
            "level": "C1"
          },
          {
            "en": "It's the key to progress.",
            "fa": "این کلید پیشرفت است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about university life",
        "context": "Students discuss college experiences.",
        "speakerA": [
          {
            "en": "I am a university student.",
            "fa": "من یک دانشجوی دانشگاه هستم.",
            "level": "A1"
          },
          {
            "en": "I study engineering.",
            "fa": "من مهندسی می‌خوانم.",
            "level": "A2"
          },
          {
            "en": "My university is very big.",
            "fa": "دانشگاه من بسیار بزرگ است.",
            "level": "A2"
          },
          {
            "en": "I live in student housing.",
            "fa": "من در خوابگاه دانشجویی زندگی می‌کنم.",
            "level": "B1"
          },
          {
            "en": "I have to write a thesis this year.",
            "fa": "من امسال باید پایان‌نامه بنویسم.",
            "level": "B1"
          },
          {
            "en": "The workload is quite demanding.",
            "fa": "حجم کار نسبتاً زیاد است.",
            "level": "B2"
          },
          {
            "en": "Academic research is challenging.",
            "fa": "تحقیقات دانشگاهی چالش‌برانگیز است.",
            "level": "C1"
          },
          {
            "en": "Higher education fosters intellectual growth.",
            "fa": "آموزش عالی باعث رشد فکری می‌شود.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "What year are you in?",
            "fa": "در چه سالی هستی؟",
            "level": "A1"
          },
          {
            "en": "That's a good field.",
            "fa": "این رشته خوبی است.",
            "level": "A2"
          },
          {
            "en": "Is it a good university?",
            "fa": "آیا دانشگاه خوبی است؟",
            "level": "A2"
          },
          {
            "en": "Do you like it there?",
            "fa": "آیا آنجا را دوست داری؟",
            "level": "B1"
          },
          {
            "en": "Good luck with that.",
            "fa": "در آن موفق باشی.",
            "level": "B1"
          },
          {
            "en": "I'm sure you'll manage.",
            "fa": "مطمئنم می‌توانی مدیریت کنی.",
            "level": "B2"
          },
          {
            "en": "It's the pursuit of knowledge.",
            "fa": "این جستجوی دانش است.",
            "level": "C1"
          },
          {
            "en": "It's a transformative experience.",
            "fa": "این یک تجربه متحول‌کننده است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "رسانه (The Media)",
    "scenarios": [
      {
        "scenario": "Talking about news sources",
        "context": "People discuss where they get their news.",
        "speakerA": [
          {
            "en": "I watch the news every evening.",
            "fa": "من هر شب اخبار را تماشا می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I read the newspaper in the morning.",
            "fa": "من روزنامه را صبح می‌خوانم.",
            "level": "A2"
          },
          {
            "en": "I get my news online.",
            "fa": "من اخبارم را آنلاین دریافت می‌کنم.",
            "level": "A2"
          },
          {
            "en": "Social media can spread misinformation.",
            "fa": "رسانه‌های اجتماعی می‌توانند اطلاعات نادرست را پخش کنند.",
            "level": "B1"
          },
          {
            "en": "I prefer reliable news sources.",
            "fa": "من منابع خبری معتبر را ترجیح می‌دهم.",
            "level": "B1"
          },
          {
            "en": "Media literacy is crucial nowadays.",
            "fa": "سواد رسانه‌ای این روزها بسیار مهم است.",
            "level": "B2"
          },
          {
            "en": "The media plays a powerful role in shaping public opinion.",
            "fa": "رسانه نقش قدرتمندی در شکل‌دهی به افکار عمومی دارد.",
            "level": "C1"
          },
          {
            "en": "Investigative journalism is vital for democracy.",
            "fa": "روزنامه‌نگاری تحقیقی برای دموکراسی حیاتی است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I watch TV news too.",
            "fa": "من هم اخبار تلویزیون را تماشا می‌کنم.",
            "level": "A1"
          },
          {
            "en": "I read it online.",
            "fa": "من آن را آنلاین می‌خوانم.",
            "level": "A2"
          },
          {
            "en": "Is it free?",
            "fa": "آیا رایگان است؟",
            "level": "A2"
          },
          {
            "en": "I've noticed that too.",
            "fa": "من هم متوجه آن شده‌ام.",
            "level": "B1"
          },
          {
            "en": "I try to do the same.",
            "fa": "من هم سعی می‌کنم همین کار را بکنم.",
            "level": "B1"
          },
          {
            "en": "We all need to be critical.",
            "fa": "همه ما باید انتقادی باشیم.",
            "level": "B2"
          },
          {
            "en": "It can be dangerous without ethics.",
            "fa": "بدون اخلاق می‌تواند خطرناک باشد.",
            "level": "C1"
          },
          {
            "en": "Journalism must remain independent.",
            "fa": "روزنامه‌نگاری باید مستقل بماند.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing social media influence",
        "context": "Talking about how social media affects society.",
        "speakerA": [
          {
            "en": "I spend time on social media.",
            "fa": "من در رسانه‌های اجتماعی وقت می‌گذرانم.",
            "level": "A1"
          },
          {
            "en": "I have an Instagram account.",
            "fa": "من یک حساب اینستاگرام دارم.",
            "level": "A2"
          },
          {
            "en": "Social media connects people.",
            "fa": "رسانه‌های اجتماعی مردم را به هم متصل می‌کنند.",
            "level": "A2"
          },
          {
            "en": "It can be addictive.",
            "fa": "می‌تواند اعتیادآور باشد.",
            "level": "B1"
          },
          {
            "en": "I sometimes take breaks from it.",
            "fa": "من گاهی از آن فاصله می‌گیرم.",
            "level": "B1"
          },
          {
            "en": "We should use social media responsibly.",
            "fa": "ما باید از رسانه‌های اجتماعی مسئولانه استفاده کنیم.",
            "level": "B2"
          },
          {
            "en": "Digital wellbeing is a priority.",
            "fa": "سلامت دیجیتال یک اولویت است.",
            "level": "C1"
          },
          {
            "en": "We must balance online and offline life.",
            "fa": "ما باید زندگی آنلاین و آفلاین را متعادل کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I do too, it's fun.",
            "fa": "من هم انجام می‌دهم، سرگرم‌کننده است.",
            "level": "A1"
          },
          {
            "en": "I prefer Facebook.",
            "fa": "من فیسبوک را ترجیح می‌دهم.",
            "level": "A2"
          },
          {
            "en": "It connects me with friends.",
            "fa": "مرا با دوستانم متصل می‌کند.",
            "level": "A2"
          },
          {
            "en": "Yes, it's a real problem.",
            "fa": "بله، این یک مشکل واقعی است.",
            "level": "B1"
          },
          {
            "en": "That's a healthy approach.",
            "fa": "این یک رویکرد سالم است.",
            "level": "B1"
          },
          {
            "en": "I completely agree with you.",
            "fa": "من کاملاً با شما موافقم.",
            "level": "B2"
          },
          {
            "en": "We need to set boundaries.",
            "fa": "ما باید محدودیت تعیین کنیم.",
            "level": "C1"
          },
          {
            "en": "It's about mindful engagement.",
            "fa": "این در مورد مشارکت آگاهانه است.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "حیوانات (Animals)",
    "scenarios": [
      {
        "scenario": "Talking about pets",
        "context": "People discuss their pets and animals.",
        "speakerA": [
          {
            "en": "I have a dog.",
            "fa": "من یک سگ دارم.",
            "level": "A1"
          },
          {
            "en": "My cat is very playful.",
            "fa": "گربه من بسیار بازیگوش است.",
            "level": "A2"
          },
          {
            "en": "I love all animals.",
            "fa": "من همه حیوانات را دوست دارم.",
            "level": "A2"
          },
          {
            "en": "Pet ownership is a responsibility.",
            "fa": "داشتن حیوان خانگی یک مسئولیت است.",
            "level": "B1"
          },
          {
            "en": "Animals provide great companionship.",
            "fa": "حیوانات همراهی عالی فراهم می‌کنند.",
            "level": "B1"
          },
          {
            "en": "Adopting pets is better than buying them.",
            "fa": "به فرزندی گرفتن حیوانات بهتر از خرید آنهاست.",
            "level": "B2"
          },
          {
            "en": "Animal welfare is a moral obligation.",
            "fa": "رفاه حیوانات یک تعهد اخلاقی است.",
            "level": "C1"
          },
          {
            "en": "We must protect all living creatures.",
            "fa": "ما باید از همه موجودات زنده محافظت کنیم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "I have a cat.",
            "fa": "من یک گربه دارم.",
            "level": "A1"
          },
          {
            "en": "Dogs are very loyal.",
            "fa": "سگ‌ها بسیار وفادار هستند.",
            "level": "A2"
          },
          {
            "en": "I agree, they are amazing.",
            "fa": "موافقم، آنها شگفت‌انگیز هستند.",
            "level": "A2"
          },
          {
            "en": "You need to care for them well.",
            "fa": "شما باید به خوبی از آنها مراقبت کنید.",
            "level": "B1"
          },
          {
            "en": "They bring joy to our lives.",
            "fa": "آنها شادی را به زندگی ما می‌آورند.",
            "level": "B1"
          },
          {
            "en": "I adopted my dog from a shelter.",
            "fa": "من سگم را از یک پناهگاه به فرزندی گرفتم.",
            "level": "B2"
          },
          {
            "en": "We should prevent animal cruelty.",
            "fa": "ما باید از ظلم به حیوانات جلوگیری کنیم.",
            "level": "C1"
          },
          {
            "en": "Compassion extends to all beings.",
            "fa": "شفقت به همه موجودات گسترش می‌یابد.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Talking about wildlife",
        "context": "Discussing animals in the wild and conservation.",
        "speakerA": [
          {
            "en": "I saw a deer in the forest.",
            "fa": "من یک گوزن در جنگل دیدم.",
            "level": "A2"
          },
          {
            "en": "Elephants are very large.",
            "fa": "فیل‌ها بسیار بزرگ هستند.",
            "level": "A2"
          },
          {
            "en": "Wild animals are beautiful.",
            "fa": "حیوانات وحشی زیبا هستند.",
            "level": "B1"
          },
          {
            "en": "We need to protect endangered species.",
            "fa": "ما باید از گونه‌های در معرض خطر محافظت کنیم.",
            "level": "B1"
          },
          {
            "en": "Habitat destruction threatens wildlife.",
            "fa": "تخریب زیستگاه حیات وحش را تهدید می‌کند.",
            "level": "B2"
          },
          {
            "en": "Conservation efforts make a difference.",
            "fa": "تلاش‌های حفاظتی تفاوت ایجاد می‌کنند.",
            "level": "C1"
          },
          {
            "en": "Biodiversity is essential for survival.",
            "fa": "تنوع زیستی برای بقا ضروری است.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "How wonderful!",
            "fa": "چه فوق‌العاده!",
            "level": "A2"
          },
          {
            "en": "They are magnificent.",
            "fa": "آنها باشکوه هستند.",
            "level": "A2"
          },
          {
            "en": "I agree, it's incredible.",
            "fa": "موافقم، باورنکردنی است.",
            "level": "B1"
          },
          {
            "en": "We must act now.",
            "fa": "ما باید الان اقدام کنیم.",
            "level": "B1"
          },
          {
            "en": "It's a serious issue.",
            "fa": "این یک مسئله جدی است.",
            "level": "B2"
          },
          {
            "en": "Every person can help.",
            "fa": "هر فردی می‌تواند کمک کند.",
            "level": "C1"
          },
          {
            "en": "Our future depends on it.",
            "fa": "آینده ما به آن بستگی دارد.",
            "level": "C2"
          }
        ]
      }
    ]
  },
  {
    "topic": "خانه (Home and Housing)",
    "scenarios": [
      {
        "scenario": "Talking about your home",
        "context": "People describe where they live.",
        "speakerA": [
          {
            "en": "I live in an apartment.",
            "fa": "من در یک آپارتمان زندگی می‌کنم.",
            "level": "A1"
          },
          {
            "en": "My house has a big garden.",
            "fa": "خانه من یک باغ بزرگ دارد.",
            "level": "A2"
          },
          {
            "en": "I live with my family.",
            "fa": "من با خانواده‌ام زندگی می‌کنم.",
            "level": "A2"
          },
          {
            "en": "I want to buy a house someday.",
            "fa": "من می‌خواهم یک روز خانه بخرم.",
            "level": "B1"
          },
          {
            "en": "The rent is very expensive.",
            "fa": "اجاره بسیار گران است.",
            "level": "B1"
          },
          {
            "en": "I love my cozy home.",
            "fa": "من خانه دنج خود را دوست دارم.",
            "level": "B2"
          },
          {
            "en": "Housing is a fundamental need.",
            "fa": "مسکن یک نیاز اساسی است.",
            "level": "C1"
          },
          {
            "en": "We need affordable housing solutions.",
            "fa": "ما به راه‌حل‌های مسکن مقرون‌به‌صرفه نیاز داریم.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "Is it in the city?",
            "fa": "آیا در شهر است؟",
            "level": "A1"
          },
          {
            "en": "That sounds lovely.",
            "fa": "به نظر دلپذیر می‌رسد.",
            "level": "A2"
          },
          {
            "en": "That's a nice way to live.",
            "fa": "این روش خوبی برای زندگی است.",
            "level": "A2"
          },
          {
            "en": "That's a good dream.",
            "fa": "این یک رویای خوب است.",
            "level": "B1"
          },
          {
            "en": "Housing costs are rising.",
            "fa": "هزینه‌های مسکن در حال افزایش است.",
            "level": "B1"
          },
          {
            "en": "Home is where the heart is.",
            "fa": "خانه جایی است که قلب در آن است.",
            "level": "B2"
          },
          {
            "en": "We must ensure everyone has shelter.",
            "fa": "ما باید اطمینان حاصل کنیم که همه سرپناه دارند.",
            "level": "C1"
          },
          {
            "en": "It's a social responsibility.",
            "fa": "این یک مسئولیت اجتماعی است.",
            "level": "C2"
          }
        ]
      },
      {
        "scenario": "Discussing housing problems",
        "context": "Talking about issues like maintenance and rent.",
        "speakerA": [
          {
            "en": "My roof is leaking.",
            "fa": "سقف من نشت می‌کند.",
            "level": "A2"
          },
          {
            "en": "I need a plumber.",
            "fa": "من به یک لوله‌کش نیاز دارم.",
            "level": "A2"
          },
          {
            "en": "The landlord is not responding.",
            "fa": "صاحبخانه پاسخ نمی‌دهد.",
            "level": "B1"
          },
          {
            "en": "I want to move to a bigger home.",
            "fa": "من می‌خواهم به خانه بزرگ‌تری نقل مکان کنم.",
            "level": "B1"
          },
          {
            "en": "The housing market is challenging.",
            "fa": "بازار مسکن چالش‌برانگیز است.",
            "level": "B2"
          },
          {
            "en": "We need more social housing.",
            "fa": "ما به مسکن اجتماعی بیشتری نیاز داریم.",
            "level": "C1"
          },
          {
            "en": "Urban planning affects housing quality.",
            "fa": "برنامه‌ریزی شهری بر کیفیت مسکن تأثیر می‌گذارد.",
            "level": "C2"
          }
        ],
        "speakerB": [
          {
            "en": "That's a serious issue.",
            "fa": "این یک مشکل جدی است.",
            "level": "A2"
          },
          {
            "en": "I hope you find one quickly.",
            "fa": "امیدوارم سریعاً یکی پیدا کنی.",
            "level": "A2"
          },
          {
            "en": "That's frustrating.",
            "fa": "این ناامیدکننده است.",
            "level": "B1"
          },
          {
            "en": "I hope you find the right place.",
            "fa": "امیدوارم جای مناسب را پیدا کنی.",
            "level": "B1"
          },
          {
            "en": "Buying a home is very expensive now.",
            "fa": "خریدن خانه الان بسیار گران است.",
            "level": "B2"
          },
          {
            "en": "It's a basic human right.",
            "fa": "این یک حق اساسی بشر است.",
            "level": "C1"
          },
          {
            "en": "We need long-term solutions.",
            "fa": "ما به راه‌حل‌های بلندمدت نیاز داریم.",
            "level": "C2"
          }
        ]
      }
    ]
  }
];

export default DAILY_CONVERSATIONS;