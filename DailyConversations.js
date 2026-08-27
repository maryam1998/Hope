export const DAILY_CONVERSATIONS = [
  // ============================================================
  // TOPIC 1: Greetings and Small Talk
  // ============================================================
  {
    "topic": "Greetings and Small Talk",
    "scenarios": [
      {
        "scenario": "First-time meeting (casual)",
        "context": "Two people meet for the first time in a casual setting.",
        "speakerA": [
          { "en": "Hi, I'm Alex.", "fa": "سلام، من الکس هستم.", "level": "A1" },
          { "en": "Hello, my name is Sarah.", "fa": "سلام، اسم من سارا است.", "level": "A1" },
          { "en": "Hey, I don't think we've met. I'm Jamie.", "fa": "هی، فکر نکنم همدیگر را دیده باشیم. من جیمی هستم.", "level": "A2" },
          { "en": "Nice to meet you! I'm Chris.", "fa": "از ملاقات شما خوشوقتم! من کریس هستم.", "level": "A1" },
          { "en": "How do you do? I'm Mr. Johnson.", "fa": "خوشوقتم؟ من آقای جانسون هستم.", "level": "B1" },
          { "en": "Pleased to meet you. I'm Dr. Lee.", "fa": "از دیدار شما خوشحالم. من دکتر لی هستم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Hi Alex, I'm Jordan.", "fa": "سلام الکس، من جردن هستم.", "level": "A1" },
          { "en": "Hello Sarah, nice to meet you too.", "fa": "سلام سارا، من هم از دیدار شما خوشوقتم.", "level": "A1" },
          { "en": "Hey Jamie, I'm Taylor. How are you?", "fa": "هی جیمی، من تیلور هستم. چطورید؟", "level": "A2" },
          { "en": "Nice to meet you too, Chris. How's it going?", "fa": "من هم از ملاقات شما خوشحالم، کریس. اوضاع چطوره؟", "level": "B1" },
          { "en": "How do you do, Mr. Johnson? I'm pleased to meet you.", "fa": "خوشوقتم آقای جانسون؟ از ملاقات شما خوشحالم.", "level": "B1" },
          { "en": "It's an honour to meet you, Dr. Lee.", "fa": "مایه افتخار است که شما را ملاقات می‌کنم، دکتر لی.", "level": "C1" }
        ]
      },
      {
        "scenario": "Asking about well-being (general)",
        "context": "After greeting, one asks how the other is doing.",
        "speakerA": [
          { "en": "How are you?", "fa": "چطورید؟", "level": "A1" },
          { "en": "How are you doing?", "fa": "اوضاع چطوره؟", "level": "A2" },
          { "en": "How's everything going?", "fa": "همه چیز چطور پیش می‌ره؟", "level": "B1" },
          { "en": "How's life treating you?", "fa": "زندگی با شما چطور برخورد می‌کنه؟", "level": "B2" },
          { "en": "How have you been lately?", "fa": "این روزها چطور بوده‌اید؟", "level": "B2" },
          { "en": "What's up with you these days?", "fa": "این روزها چه خبر از شما؟", "level": "C1" },
          { "en": "How was your weekend?", "fa": "آخر هفته‌ات چطور بود؟", "level": "A2" },
          { "en": "How was your day?", "fa": "روزت چطور بود؟", "level": "A2" },
          { "en": "How are things at work?", "fa": "اوضاع سر کار چطوره؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "Fine, thanks. And you?", "fa": "خوبم، متشکرم. شما چطورید؟", "level": "A1" },
          { "en": "Pretty good, thanks for asking.", "fa": "نسبتاً خوبم، ممنون که پرسیدید.", "level": "A2" },
          { "en": "Not bad, just busy as usual.", "fa": "بد نیست، مثل همیشه مشغول.", "level": "B1" },
          { "en": "I'm doing well, actually. I just got a promotion.", "fa": "در واقع خوبم. تازه ترفیع گرفتم.", "level": "B2" },
          { "en": "Could be better, but I can't complain.", "fa": "می‌توانست بهتر باشد، اما نمی‌تونم شکایت کنم.", "level": "C1" },
          { "en": "It's been a bit stressful, but I'm managing.", "fa": "کمی استرس‌زا بوده، اما دارم مدیریتش می‌کنم.", "level": "C1" },
          { "en": "My weekend was great! I went hiking.", "fa": "آخر هفته‌ام عالی بود! رفتم کوهنوردی.", "level": "A2" },
          { "en": "My day was quite productive, thanks.", "fa": "روزم نسبتاً پربار بود، ممنون.", "level": "B1" },
          { "en": "Work is hectic, but I enjoy it.", "fa": "کار شلوغه، اما ازش لذت می‌برم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 2: Introducing People
  // ============================================================
  {
    "topic": "Introducing People",
    "scenarios": [
      {
        "scenario": "Introducing oneself",
        "context": "One person introduces themselves to another.",
        "speakerA": [
          { "en": "Hi, I'm Anna.", "fa": "سلام، من آنا هستم.", "level": "A1" },
          { "en": "Hello, my name is David. What's yours?", "fa": "سلام، اسم من دیوید است. اسم شما چیست؟", "level": "A1" },
          { "en": "Let me introduce myself – I'm Dr. Brown.", "fa": "بگذارید خودم را معرفی کنم – من دکتر براون هستم.", "level": "B1" },
          { "en": "I don't think we've met. I'm Emily.", "fa": "فکر نکنم همدیگر را دیده باشیم. من امیلی هستم.", "level": "A2" },
          { "en": "Allow me to introduce myself: I'm Professor Smith.", "fa": "اجازه دهید خودم را معرفی کنم: من پروفسور اسمیت هستم.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "Hi Anna, I'm John.", "fa": "سلام آنا، من جان هستم.", "level": "A1" },
          { "en": "Nice to meet you, David.", "fa": "از ملاقات شما خوشوقتم، دیوید.", "level": "A1" },
          { "en": "Pleased to meet you, Dr. Brown.", "fa": "از دیدار شما خوشحالم، دکتر براون.", "level": "B1" },
          { "en": "Oh, hi Emily! I'm Mike.", "fa": "اوه، سلام امیلی! من مایک هستم.", "level": "A2" },
          { "en": "It's an honour, Professor Smith.", "fa": "مایه افتخار است، پروفسور اسمیت.", "level": "C1" }
        ]
      },
      {
        "scenario": "Introducing two people to each other",
        "context": "A third person introduces two strangers.",
        "speakerA": [
          { "en": "Let me introduce you to my colleague, Lisa.", "fa": "بگذارید شما را به همکارم، لیزا معرفی کنم.", "level": "B1" },
          { "en": "This is my friend, Tom. Tom, this is Sarah.", "fa": "این دوست من، تام است. تام، این سارا است.", "level": "A2" },
          { "en": "I'd like you to meet my brother, James.", "fa": "مایلم برادرم، جیمز را ملاقات کنید.", "level": "B1" },
          { "en": "Have you two met? This is Maria.", "fa": "آیا شما دو تا همدیگر را ملاقات کرده‌اید؟ این ماریا است.", "level": "B2" },
          { "en": "Allow me to present our new manager, Mr. Adams.", "fa": "اجازه دهید مدیر جدیدمان، آقای آدامز را معرفی کنم.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "Hi Lisa, nice to meet you.", "fa": "سلام لیزا، از ملاقات شما خوشوقتم.", "level": "A1" },
          { "en": "Hey Tom, how's it going?", "fa": "هی تام، اوضاع چطوره؟", "level": "A2" },
          { "en": "Nice to meet you, James. I've heard a lot about you.", "fa": "از ملاقات شما خوشوقتم، جیمز. چیزهای زیادی درباره شما شنیده‌ام.", "level": "B1" },
          { "en": "No, we haven't met. Hello Maria.", "fa": "نه، همدیگر را ندیده‌ایم. سلام ماریا.", "level": "A2" },
          { "en": "How do you do, Mr. Adams? I'm pleased to meet you.", "fa": "خوشوقتم، آقای آدامز؟ از دیدار شما خوشحالم.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 3: Visiting an Old Friend
  // ============================================================
  {
    "topic": "Visiting an Old Friend",
    "scenarios": [
      {
        "scenario": "Meeting unexpectedly",
        "context": "Two friends run into each other after a long time.",
        "speakerA": [
          { "en": "Wow, I haven't seen you for ages!", "fa": "واو، سال‌هاست تو را ندیده‌ام!", "level": "A2" },
          { "en": "How nice to see you again!", "fa": "چه خوب شد دوباره تو را دیدم!", "level": "A2" },
          { "en": "What a surprise! How have you been?", "fa": "چه تعجب! چطور بوده‌ای؟", "level": "B1" },
          { "en": "I thought you were in Canada. What are you doing here?", "fa": "فکر کردم کانادا هستی. اینجا چیکار می‌کنی؟", "level": "B1" },
          { "en": "You look great! Have you been working out?", "fa": "عالی به نظر می‌رسی! ورزش می‌کردی؟", "level": "B2" }
        ],
        "speakerB": [
          { "en": "I know, it's been too long!", "fa": "می‌دانم، خیلی وقته!", "level": "A2" },
          { "en": "Nice to see you too! What's new with you?", "fa": "من هم خوشحالم که تو را می‌بینم! چه خبر از تو؟", "level": "A2" },
          { "en": "I've been busy with work and family. How about you?", "fa": "سر کار و خانواده مشغول بودم. تو چطور؟", "level": "B1" },
          { "en": "I came back last week. I'm here for a conference.", "fa": "هفته پیش برگشتم. برای یک کنفرانس اینجام.", "level": "B1" },
          { "en": "Thanks! I've been trying to stay fit.", "fa": "ممنون! سعی کردم تناسب اندامم را حفظ کنم.", "level": "B2" }
        ]
      },
      {
        "scenario": "Planned visit to a friend's place",
        "context": "One friend visits the other at their home.",
        "speakerA": [
          { "en": "Hi, I came to see you as promised.", "fa": "سلام، طبق قولم به دیدنت آمدم.", "level": "A2" },
          { "en": "Thanks for having me over.", "fa": "ممنون که من را دعوت کردی.", "level": "B1" },
          { "en": "Your house looks lovely! I love the new decor.", "fa": "خانه‌ات قشنگه! دکوراسیون جدید را دوست دارم.", "level": "B1" },
          { "en": "How have you been keeping? I've missed our chats.", "fa": "چطور بودی؟ دلم برای گپ‌هایمان تنگ شده.", "level": "B2" },
          { "en": "I brought some cake for us.", "fa": "یک کیک برایمان آوردم.", "level": "A2" }
        ],
        "speakerB": [
          { "en": "Welcome! Come in, make yourself at home.", "fa": "خوش آمدی! بیا داخل، خودت را در خانه ات فرض کن.", "level": "A2" },
          { "en": "It's so good to see you again!", "fa": "خیلی خوبه که دوباره می‌بینمت!", "level": "A2" },
          { "en": "I'm glad you like it. I just redecorated.", "fa": "خوشحالم که دوست داری. تازه دکوراسیون را عوض کردم.", "level": "B1" },
          { "en": "I've been well, just busy. I missed you too!", "fa": "خوب بودم، فقط مشغول. دلم هم برای تو تنگ شده!", "level": "B2" },
          { "en": "Oh, you didn't have to bring anything. Thanks!", "fa": "اوه، نباید چیزی می‌آوردی. ممنون!", "level": "A2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 4: Getting Acquainted (Personal Questions)
  // ============================================================
  {
    "topic": "Getting Acquainted (Personal Questions)",
    "scenarios": [
      {
        "scenario": "Asking about origin and background",
        "context": "People ask each other about nationality, city, etc.",
        "speakerA": [
          { "en": "Where are you from?", "fa": "اهل کجا هستید؟", "level": "A1" },
          { "en": "What country are you from?", "fa": "اهل کدام کشور هستید؟", "level": "A1" },
          { "en": "Which city are you from?", "fa": "از کدام شهر هستید؟", "level": "A2" },
          { "en": "Are you originally from here?", "fa": "اصلأ اهل اینجا هستید؟", "level": "B1" },
          { "en": "What is your nationality?", "fa": "ملیت شما چیست؟", "level": "A2" }
        ],
        "speakerB": [
          { "en": "I'm from Iran.", "fa": "اهل ایران هستم.", "level": "A1" },
          { "en": "I come from Germany.", "fa": "از آلمان آمده‌ام.", "level": "A1" },
          { "en": "I'm from Tehran, the capital.", "fa": "اهل تهران، پایتخت هستم.", "level": "A2" },
          { "en": "No, I moved here five years ago.", "fa": "نه، پنج سال پیش به اینجا نقل مکان کردم.", "level": "B1" },
          { "en": "My nationality is Italian.", "fa": "ملیت من ایتالیایی است.", "level": "A2" }
        ]
      },
      {
        "scenario": "Asking about job and study",
        "context": "People ask about occupation or education.",
        "speakerA": [
          { "en": "What do you do for a living?", "fa": "چه شغلی دارید؟", "level": "A2" },
          { "en": "Are you a student or working?", "fa": "دانشجو هستید یا شاغل؟", "level": "A2" },
          { "en": "What do you study?", "fa": "چه رشته‌ای تحصیل می‌کنید؟", "level": "A2" },
          { "en": "What's your profession?", "fa": "حرفه شما چیست؟", "level": "B1" },
          { "en": "Where do you work?", "fa": "کجا کار می‌کنید؟", "level": "A1" }
        ],
        "speakerB": [
          { "en": "I'm a teacher.", "fa": "معلم هستم.", "level": "A1" },
          { "en": "I'm a student at the university.", "fa": "دانشجوی دانشگاه هستم.", "level": "A1" },
          { "en": "I study business administration.", "fa": "مدیریت بازرگانی می‌خوانم.", "level": "A2" },
          { "en": "I'm a software engineer.", "fa": "مهندس نرم‌افزار هستم.", "level": "B1" },
          { "en": "I work in a bank downtown.", "fa": "در یک بانک در مرکز شهر کار می‌کنم.", "level": "A2" }
        ]
      },
      {
        "scenario": "Family and hobbies",
        "context": "Asking about family, interests, free time.",
        "speakerA": [
          { "en": "Are you married or single?", "fa": "متاهل هستید یا مجرد؟", "level": "A1" },
          { "en": "Do you have any children?", "fa": "بچه دارید؟", "level": "A2" },
          { "en": "What are your hobbies?", "fa": "سرگرمی‌های شما چیست؟", "level": "A2" },
          { "en": "How do you spend your free time?", "fa": "وقت آزادتان را چطور می‌گذرانید؟", "level": "B1" },
          { "en": "Do you like to read or watch movies?", "fa": "کتاب خواندن یا فیلم دیدن را دوست دارید؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "I'm married with two kids.", "fa": "متاهل هستم و دو تا بچه دارم.", "level": "A2" },
          { "en": "I'm single, actually.", "fa": "در واقع مجرد هستم.", "level": "A1" },
          { "en": "I enjoy hiking and photography.", "fa": "کوهنوردی و عکاسی را دوست دارم.", "level": "A2" },
          { "en": "In my free time, I like to cook and travel.", "fa": "در وقت آزادم آشپزی و سفر را دوست دارم.", "level": "B1" },
          { "en": "I love both! I read novels and watch documentaries.", "fa": "هر دو را دوست دارم! رمان می‌خوانم و مستند می‌بینم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 5: Invitations
  // ============================================================
  {
    "topic": "Invitations",
    "scenarios": [
      {
        "scenario": "Extending an invitation (formal/informal)",
        "context": "One person invites another to an event or meal.",
        "speakerA": [
          { "en": "Would you like to join me for lunch today?", "fa": "مایلید امروز با من ناهار بخورید؟", "level": "A2" },
          { "en": "Can you come to my place for dinner on Saturday?", "fa": "آیا می‌توانید شنبه برای شام به منزل من بیایید؟", "level": "A2" },
          { "en": "We'd love to have you over for a barbecue this weekend.", "fa": "ما خیلی دوست داریم شما را برای کباب آخر هفته مهمان کنیم.", "level": "B1" },
          { "en": "I'd like to invite you to a concert next Friday if you're free.", "fa": "اگر آزاد هستید، دوست دارم شما را به یک کنسرت جمعه آینده دعوت کنم.", "level": "B2" },
          { "en": "Would you be interested in joining us for a hike on Sunday?", "fa": "آیا به پیاده‌روی یکشنبه با ما علاقه‌مندید؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "I'd love to! What time?", "fa": "با کمال میل! چه ساعتی؟", "level": "A2" },
          { "en": "That sounds great. I'll be there.", "fa": "عالی به نظر می‌رسد. می‌آیم.", "level": "A2" },
          { "en": "Thank you for the invitation. I'd be delighted to come.", "fa": "از دعوتتان متشکرم. خوشحال می‌شوم بیایم.", "level": "B1" },
          { "en": "I'd love to, but I'm afraid I have other plans.", "fa": "خیلی دوست دارم، اما متأسفم برنامه دیگری دارم.", "level": "B1" },
          { "en": "I'm not sure yet. Can I let you know later?", "fa": "هنوز مطمئن نیستم. می‌توانم بعداً به شما خبر بدهم؟", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 6: Accepting or Refusing an Invitation
  // ============================================================
  {
    "topic": "Accepting or Refusing an Invitation",
    "scenarios": [
      {
        "scenario": "Polite acceptance",
        "context": "Accepting an invitation gracefully.",
        "speakerA": [
          { "en": "I'd love to come, thank you.", "fa": "خیلی دوست دارم بیایم، ممنون.", "level": "A2" },
          { "en": "That would be wonderful. I'll be happy to join.", "fa": "عالی خواهد بود. خوشحال می‌شوم ملحق شوم.", "level": "B1" },
          { "en": "Yes, I'd be delighted to accept.", "fa": "بله، با کمال میل می‌پذیرم.", "level": "B2" },
          { "en": "Sounds perfect! I wouldn't miss it.", "fa": "عالی به نظر می‌رسد! از دستش نمی‌دهم.", "level": "B1" }
        ],
        "speakerB": [
          { "en": "I'm glad you can make it.", "fa": "خوشحالم که می‌توانید بیایید.", "level": "A2" },
          { "en": "Great! I'll count you in.", "fa": "عالی! حساب شما را می‌کنم.", "level": "B1" },
          { "en": "Perfect, I'll see you then.", "fa": "عالی، پس می‌بینمتان.", "level": "A2" }
        ]
      },
      {
        "scenario": "Polite refusal",
        "context": "Declining an invitation politely.",
        "speakerA": [
          { "en": "I'm sorry, but I won't be able to come.", "fa": "متأسفم، اما نمی‌توانم بیایم.", "level": "A2" },
          { "en": "I'd love to, but I already have plans.", "fa": "خیلی دوست دارم، اما از قبل برنامه دارم.", "level": "B1" },
          { "en": "Thank you so much for asking, but I can't make it.", "fa": "خیلی ممنون که دعوت کردید، اما نمی‌توانم.", "level": "B1" },
          { "en": "I wish I could, but I'm afraid I'm busy that day.", "fa": "کاش می‌توانستم، اما متأسفم آن روز مشغولم.", "level": "B2" },
          { "en": "Maybe next time! Thanks anyway.", "fa": "شاید دفعه بعد! به هر حال ممنون.", "level": "A2" }
        ],
        "speakerB": [
          { "en": "No problem, maybe another time.", "fa": "اشکال ندارد، شاید دفعه دیگر.", "level": "A2" },
          { "en": "That's a pity, but I understand.", "fa": "حیف شد، اما متوجه می‌شوم.", "level": "B1" },
          { "en": "Don't worry, we'll catch up later.", "fa": "نگران نباش، بعداً می‌بینمت.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 7: Saying Goodbye
  // ============================================================
  {
    "topic": "Saying Goodbye",
    "scenarios": [
      {
        "scenario": "Informal farewell",
        "context": "Two people part ways casually.",
        "speakerA": [
          { "en": "Bye! See you later.", "fa": "خدا حافظ! بعداً می‌بینمت.", "level": "A1" },
          { "en": "Catch you later!", "fa": "بعداً می‌بینمت!", "level": "A2" },
          { "en": "It was great seeing you. Take care!", "fa": "دیدار شما عالی بود. مراقب خودت باش!", "level": "B1" },
          { "en": "I've got to run. Talk soon!", "fa": "باید بروم. به زودی صحبت می‌کنیم!", "level": "B1" },
          { "en": "See you around!", "fa": "می‌بینمت!", "level": "A2" }
        ],
        "speakerB": [
          { "en": "Bye! Take it easy.", "fa": "خدا حافظ! سخت نگیر.", "level": "A2" },
          { "en": "See you later, alligator!", "fa": "بعداً می‌بینمت!", "level": "A2" },
          { "en": "You too! Have a good one.", "fa": "شما هم! روز خوبی داشته باش.", "level": "B1" },
          { "en": "Goodbye, and thanks for everything.", "fa": "خدا حافظ و ممنون برای همه چیز.", "level": "B1" }
        ]
      },
      {
        "scenario": "Formal farewell",
        "context": "Leaving a formal event or meeting.",
        "speakerA": [
          { "en": "Goodbye, it was a pleasure meeting you.", "fa": "خداحافظ، از ملاقات شما خوشحال شدم.", "level": "B1" },
          { "en": "Thank you for your time. I must be going now.", "fa": "از وقتی که گذاشتید متشکرم. حالا باید بروم.", "level": "B2" },
          { "en": "I hope to see you again soon.", "fa": "امیدوارم به زودی دوباره شما را ببینم.", "level": "B1" },
          { "en": "Please give my regards to your family.", "fa": "لطفاً سلام مرا به خانواده‌تان برسانید.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "It was nice meeting you too. Goodbye.", "fa": "من هم از ملاقات شما خوشحال شدم. خداحافظ.", "level": "B1" },
          { "en": "Thank you for coming. Have a safe journey.", "fa": "ممنون که تشریف آوردید. سفر بخیر.", "level": "B2" },
          { "en": "I hope we can meet again. Take care.", "fa": "امیدوارم دوباره ملاقات کنیم. مراقب باشید.", "level": "B1" },
          { "en": "I will. Goodbye, and all the best.", "fa": "حتماً. خداحافظ و بهترین‌ها را برایتان آرزو می‌کنم.", "level": "C1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 8: Telephone Conversation
  // ============================================================
  {
    "topic": "Telephone Conversation",
    "scenarios": [
      {
        "scenario": "Making a call",
        "context": "Calling someone and asking to speak to them.",
        "speakerA": [
          { "en": "Hello, this is Alex. Is John there?", "fa": "سلام، من الکس هستم. جان آنجاست؟", "level": "A1" },
          { "en": "May I speak to Sarah, please?", "fa": "لطفاً می‌توانم با سارا صحبت کنم؟", "level": "A2" },
          { "en": "Could I talk to the manager?", "fa": "می‌توانم با مدیر صحبت کنم؟", "level": "B1" },
          { "en": "I'd like to leave a message for Mr. Smith.", "fa": "می‌خواهم برای آقای اسمیت پیغام بگذارم.", "level": "B1" },
          { "en": "Is this 555-1234?", "fa": "آیا این شماره ۵۵۵-۱۲۳۴ است؟", "level": "A1" }
        ],
        "speakerB": [
          { "en": "Speaking. Who's calling?", "fa": "خودم هستم. شما که هستید؟", "level": "A2" },
          { "en": "Please hold on. I'll see if she's in.", "fa": "لطفاً گوشی را نگه دارید. می‌بینم آیا هست یا نه.", "level": "A2" },
          { "en": "I'm afraid he's not available right now. Can I take a message?", "fa": "متأسفم او در دسترس نیست. پیغامی بگذارم؟", "level": "B1" },
          { "en": "Yes, this is 555-1234. Who are you calling?", "fa": "بله، این شماره ۵۵۵-۱۲۳۴ است. با چه کسی تماس دارید؟", "level": "A1" },
          { "en": "I'll put you through to his office.", "fa": "شما را به دفترش وصل می‌کنم.", "level": "B1" }
        ]
      },
      {
        "scenario": "Taking a message or handling wrong numbers",
        "context": "The caller asks to leave a message or has dialled incorrectly.",
        "speakerA": [
          { "en": "Can I leave a message for her?", "fa": "می‌توانم برای او پیغام بگذارم؟", "level": "A2" },
          { "en": "Please tell him I called.", "fa": "لطفاً به او بگویید من زنگ زدم.", "level": "A2" },
          { "en": "Could you ask her to call me back at this number?", "fa": "می‌توانید از او بخواهید با این شماره به من زنگ بزند؟", "level": "B1" },
          { "en": "I'm sorry, I must have dialled the wrong number.", "fa": "متأسفم، باید شماره اشتباهی گرفته باشم.", "level": "B1" },
          { "en": "I'll call back later. Thanks.", "fa": "بعداً دوباره زنگ می‌زنم. ممنون.", "level": "A2" }
        ],
        "speakerB": [
          { "en": "Sure, what's the message?", "fa": "حتماً، پیغام چیست؟", "level": "A2" },
          { "en": "I'll give him the message when he returns.", "fa": "وقتی برگشت پیغام را به او می‌رسانم.", "level": "B1" },
          { "en": "Could you spell your name, please?", "fa": "لطفاً اسمتان را هجی کنید؟", "level": "A2" },
          { "en": "I'm afraid you have the wrong extension.", "fa": "متأسفم شماره داخلی اشتباه گرفته‌اید.", "level": "B1" },
          { "en": "No problem. I'll try again later.", "fa": "اشکال ندارد. بعداً دوباره امتحان می‌کنم.", "level": "A2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 9: Transportation
  // ============================================================
  {
    "topic": "Transportation",
    "scenarios": [
      {
        "scenario": "Renting a car",
        "context": "At a car rental agency.",
        "speakerA": [
          { "en": "I'd like to rent a car for the weekend.", "fa": "می‌خواهم برای آخر هفته یک ماشین کرایه کنم.", "level": "A2" },
          { "en": "How much is the daily rate for a small car?", "fa": "نرخ روزانه برای یک ماشین کوچک چقدر است؟", "level": "A2" },
          { "en": "Do you have automatic transmission?", "fa": "دنده اتوماتیک دارید؟", "level": "B1" },
          { "en": "What insurance is included?", "fa": "چه بیمه‌ای شامل می‌شود؟", "level": "B2" },
          { "en": "Can I return the car at a different branch?", "fa": "می‌توانم ماشین را در شعبه دیگر تحویل بدهم؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "Yes, we have a compact car for $35 a day.", "fa": "بله، یک ماشین کوچک با ۳۵ دلار در روز داریم.", "level": "A2" },
          { "en": "You need a valid driver's license and a credit card.", "fa": "به گواهینامه معتبر و کارت اعتباری نیاز دارید.", "level": "B1" },
          { "en": "We require a refundable deposit.", "fa": "ما سپرده قابل استرداد نیاز داریم.", "level": "B2" },
          { "en": "Yes, you can return it at any of our city branches.", "fa": "بله، می‌توانید در هر شعبه شهری ما تحویل دهید.", "level": "B1" },
          { "en": "Please fill out this form and sign here.", "fa": "لطفاً این فرم را پر کنید و اینجا امضا کنید.", "level": "A2" }
        ]
      },
      {
        "scenario": "Using the city bus",
        "context": "Asking for directions and bus information.",
        "speakerA": [
          { "en": "Where is the nearest bus stop?", "fa": "نزدیک‌ترین ایستگاه اتوبوس کجاست؟", "level": "A1" },
          { "en": "Which bus goes to downtown?", "fa": "کدام اتوبوس به مرکز شهر می‌رود؟", "level": "A2" },
          { "en": "How often do the buses run?", "fa": "اتوبوس‌ها هر چند وقت یک بار می‌آیند؟", "level": "A2" },
          { "en": "Does this bus stop at Central Station?", "fa": "آیا این اتوبوس در ایستگاه مرکزی توقف می‌کند؟", "level": "B1" },
          { "en": "Can you tell me when to get off?", "fa": "می‌توانید به من بگویید کجا پیاده شوم؟", "level": "A2" }
        ],
        "speakerB": [
          { "en": "It's just around the corner.", "fa": "همین گوشه است.", "level": "A1" },
          { "en": "Take bus number 42.", "fa": "سوار اتوبوس شماره ۴۲ شوید.", "level": "A2" },
          { "en": "They come every 15 minutes.", "fa": "هر ۱۵ دقیقه یک بار می‌آیند.", "level": "A2" },
          { "en": "Yes, this bus goes to Central Station.", "fa": "بله، این اتوبوس به ایستگاه مرکزی می‌رود.", "level": "B1" },
          { "en": "I'll call out your stop. It's three stops from here.", "fa": "ایستگاه شما را اعلام می‌کنم. سه ایستگاه دیگر است.", "level": "B1" }
        ]
      },
      {
        "scenario": "Buying a train/plane ticket",
        "context": "At a station or booking office.",
        "speakerA": [
          { "en": "When does the next train to London leave?", "fa": "قطار بعدی به لندن چه ساعتی حرکت می‌کند؟", "level": "A2" },
          { "en": "I need a one-way ticket to Paris.", "fa": "یک بلیط یک‌طرفه به پاریس نیاز دارم.", "level": "A2" },
          { "en": "How much is a first-class ticket?", "fa": "بلیط درجه یک چقدر است؟", "level": "B1" },
          { "en": "Is there a direct flight to Tokyo?", "fa": "پرواز مستقیم به توکیو وجود دارد؟", "level": "B1" },
          { "en": "I'd like to book a flight for next Monday.", "fa": "می‌خواهم یک پرواز برای دوشنبه آینده رزرو کنم.", "level": "A2" }
        ],
        "speakerB": [
          { "en": "The next train departs at 10:15.", "fa": "قطار بعدی ساعت ۱۰:۱۵ حرکت می‌کند.", "level": "A2" },
          { "en": "A one-way ticket is $45.", "fa": "بلیط یک‌طرفه ۴۵ دلار است.", "level": "A2" },
          { "en": "First class is $150, economy is $90.", "fa": "درجه یک ۱۵۰ دلار، اقتصادی ۹۰ دلار است.", "level": "B1" },
          { "en": "We have a connecting flight via Dubai.", "fa": "یک پرواز متصل از طریق دبی داریم.", "level": "B2" },
          { "en": "Let me check availability for Monday.", "fa": "بگذارید موجودی دوشنبه را بررسی کنم.", "level": "B1" }
        ]
      },
      {
        "scenario": "Taking a taxi",
        "context": "Hailing a cab and giving directions.",
        "speakerA": [
          { "en": "Can you take me to the airport, please?", "fa": "لطفاً مرا به فرودگاه می‌برید؟", "level": "A1" },
          { "en": "How much will it cost to go to downtown?", "fa": "به مرکز شهر چقدر می‌شود؟", "level": "A2" },
          { "en": "Please stop here. I'll get out.", "fa": "لطفاً اینجا توقف کنید. پیاده می‌شوم.", "level": "A2" },
          { "en": "Could you drive a bit slower?", "fa": "می‌توانید کمی آهسته‌تر برانید؟", "level": "B1" },
          { "en": "I'm in a hurry, please take the fastest route.", "fa": "عجله دارم، لطفاً سریع‌ترین راه را بگیرید.", "level": "B1" }
        ],
        "speakerB": [
          { "en": "Sure, get in.", "fa": "حتماً، سوار شوید.", "level": "A1" },
          { "en": "That'll be about $20.", "fa": "حدود ۲۰ دلار می‌شود.", "level": "A2" },
          { "en": "Here we are. That's $12.50.", "fa": "رسیدیم. ۱۲ دلار و ۵۰ سنت می‌شود.", "level": "A2" },
          { "en": "I'll take the highway to save time.", "fa": "برای صرفه‌جویی در وقت از بزرگراه می‌روم.", "level": "B1" },
          { "en": "Can you help me with my luggage?", "fa": "می‌توانید در حمل چمدان‌ها کمکم کنید؟", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 10: Gas Station and Auto Repair
  // ============================================================
  {
    "topic": "Gas Station and Auto Repair",
    "scenarios": [
      {
        "scenario": "At a gas station",
        "context": "Refuelling the car and asking for services.",
        "speakerA": [
          { "en": "Fill it up with unleaded, please.", "fa": "لطفاً باک را با بنزین بدون سرب پر کنید.", "level": "A2" },
          { "en": "Can you check the tire pressure?", "fa": "می‌توانید باد لاستیک‌ها را چک کنید؟", "level": "B1" },
          { "en": "I need some oil, please.", "fa": "کمی روغن نیاز دارم.", "level": "A2" },
          { "en": "How much does it cost per gallon?", "fa": "هر گالن چند است؟", "level": "A2" },
          { "en": "Please clean the windshield.", "fa": "لطفاً شیشه جلو را تمیز کنید.", "level": "A2" }
        ],
        "speakerB": [
          { "en": "That's $30, please.", "fa": "۳۰ دلار می‌شود، لطفاً.", "level": "A2" },
          { "en": "Your tires are fine, but you need a bit of air.", "fa": "لاستیک‌ها خوب هستند، اما کمی باد نیاز دارند.", "level": "B1" },
          { "en": "Here's your oil. Do you want me to pour it?", "fa": "روغن شما این است. می‌خواهید بریزم؟", "level": "B1" },
          { "en": "The price is $3.50 per gallon.", "fa": "قیمت هر گالن ۳ دلار و ۵۰ سنت است.", "level": "A2" },
          { "en": "I'll clean it for you.", "fa": "آن را برایتان تمیز می‌کنم.", "level": "A2" }
        ]
      },
      {
        "scenario": "Auto repair shop",
        "context": "Describing car problems and asking for repairs.",
        "speakerA": [
          { "en": "My car won't start. Can you help?", "fa": "ماشینم روشن نمی‌شود. می‌توانید کمک کنید؟", "level": "A2" },
          { "en": "There's a strange noise from the engine.", "fa": "صدای عجیبی از موتور می‌آید.", "level": "B1" },
          { "en": "I think I have a flat tire.", "fa": "فکر کنم لاستیکم پنچر شده است.", "level": "A2" },
          { "en": "How long will it take to fix the brakes?", "fa": "تعمیر ترمزها چقدر طول می‌کشد؟", "level": "B1" },
          { "en": "Please check the battery and alternator.", "fa": "لطفاً باطری و دینام را چک کنید.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Let me have a look under the hood.", "fa": "بگذارید زیر کاپوت را نگاه کنم.", "level": "B1" },
          { "en": "It might be the spark plugs. I'll replace them.", "fa": "ممکن است شمع‌ها باشد. عوضشان می‌کنم.", "level": "B2" },
          { "en": "You have a puncture. I can fix it in about 20 minutes.", "fa": "پنچری دارید. می‌توانم حدود ۲۰ دقیقه‌ای درستش کنم.", "level": "A2" },
          { "en": "The brake pads are worn. It'll cost $150.", "fa": "لنت ترمز سائیده شده. ۱۵۰ دلار می‌شود.", "level": "B1" },
          { "en": "Your battery is dead. You need a new one.", "fa": "باطری شما تمام شده. به باطری جدید نیاز دارید.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 11: Weather and Seasons
  // ============================================================
  {
    "topic": "Weather and Seasons",
    "scenarios": [
      {
        "scenario": "Commenting on the weather (casual)",
        "context": "Two people meet and talk about today's weather.",
        "speakerA": [
          { "en": "Nice weather today, isn't it?", "fa": "امروز هوا عالیه، نه؟", "level": "A1" },
          { "en": "It's really hot outside. I'm sweating!", "fa": "بیرون واقعاً گرمه. دارم عرق می‌کنم!", "level": "A2" },
          { "en": "Looks like it's going to rain. I should have brought an umbrella.", "fa": "انگار می‌خواد بارون بیاد. کاش چتر آورده بودم.", "level": "B1" },
          { "en": "What's the forecast for this weekend?", "fa": "پیش‌بینی هوا برای آخر هفته چیه؟", "level": "A2" },
          { "en": "I can't stand this humidity. It's so sticky!", "fa": "این رطوبت رو تحمل نمی‌کنم. چقدر چسبنده است!", "level": "B2" },
          { "en": "The wind is picking up. Maybe a storm is brewing.", "fa": "باد داره تندتر می‌شه. شاید یه طوفان در راه باشه.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "Yes, it's beautiful! Perfect for a walk.", "fa": "آره، عالیه! برای قدم زدن عالیه.", "level": "A1" },
          { "en": "Tell me about it. I wish I had some iced tea.", "fa": "بگو نداره! کاش چای سرد داشتم.", "level": "A2" },
          { "en": "Yeah, I feel a few drops already. Let's go inside.", "fa": "آره، همون الان چند قطره حس می‌کنم. بریم داخل.", "level": "B1" },
          { "en": "They said it's going to be cloudy but dry.", "fa": "گفتن ابریه ولی بارون نمیاد.", "level": "A2" },
          { "en": "I know, it's unbearable. I'm heading to the coast next week.", "fa": "می‌دونم، غیرقابل تحمله. هفته بعد دارم می‌رم ساحل.", "level": "B2" },
          { "en": "Let's hope it doesn't turn into a full-blown thunderstorm.", "fa": "امیدواریم به یه طوفان واقعی تبدیل نشه.", "level": "C1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 12: At a Restaurant / Café
  // ============================================================
  {
    "topic": "At a Restaurant / Café",
    "scenarios": [
      {
        "scenario": "Ordering food and drinks",
        "context": "At a café or restaurant, ordering a meal.",
        "speakerA": [
          { "en": "Table for two, please.", "fa": "یه میز برای دو نفر، لطفاً.", "level": "A1" },
          { "en": "Can I see the menu, please?", "fa": "لطفاً منو رو می‌تونم ببینم؟", "level": "A1" },
          { "en": "What do you recommend from this menu?", "fa": "از این منو چی رو پیشنهاد می‌کنید؟", "level": "A2" },
          { "en": "I'll have the cheeseburger with a side of fries.", "fa": "چیزبرگر با سیب‌زمینی سرخ‌کرده می‌خورم.", "level": "A2" },
          { "en": "Could I have my steak medium-rare, please?", "fa": "می‌تونم استیکم رو نسبتاً خوناب گرفته باشم؟", "level": "B1" },
          { "en": "Is there any vegetarian option on the menu?", "fa": "آیا توی منو گزینه گیاه‌خواری وجود داره؟", "level": "B1" },
          { "en": "I'm afraid this soup is a bit cold. Could you heat it up?", "fa": "متأسفم این سوپ کمی سرده. میشه گرمش کنید؟", "level": "B2" },
          { "en": "Could we have the bill/check, please?", "fa": "لطفاً صورت‌حساب رو می‌تونیم داشته باشیم؟", "level": "A2" }
        ],
        "speakerB": [
          { "en": "Right this way. Here's a menu.", "fa": "بفرمایید این راه. منو اینجاست.", "level": "A1" },
          { "en": "Of course, I'll be back in a moment.", "fa": "حتماً، یه لحظه برمی‌گردم.", "level": "A1" },
          { "en": "The grilled salmon is excellent and very popular.", "fa": "ماهی سالمون کبابی عالی و خیلی محبوبه.", "level": "A2" },
          { "en": "Would you like anything to drink with that?", "fa": "با این چیزی برای نوشیدن میل دارید؟", "level": "A2" },
          { "en": "Sure, how would you like it cooked?", "fa": "حتماً، چطور دوست دارید پخته بشه؟", "level": "B1" },
          { "en": "Yes, we have a delicious vegetable pasta and a salad.", "fa": "بله، ما پاستا سبزیجات خوشمزه و سالاد داریم.", "level": "B1" },
          { "en": "I'm very sorry. I'll replace it right away.", "fa": "خیلی متأسفم. فوراً عوضش می‌کنم.", "level": "B2" },
          { "en": "Here you are. That comes to $45.70.", "fa": "بفرمایید. روی هم می‌شه ۴۵ دلار و ۷۰ سنت.", "level": "A2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 13: Shopping (Clothes and General)
  // ============================================================
  {
    "topic": "Shopping (Clothes and General)",
    "scenarios": [
      {
        "scenario": "Buying clothes or asking for prices",
        "context": "At a clothing store, looking for an item.",
        "speakerA": [
          { "en": "How much does this shirt cost?", "fa": "این پیراهن چنده؟", "level": "A1" },
          { "en": "Do you have this in a larger size?", "fa": "این رو سایز بزرگتر دارید؟", "level": "A2" },
          { "en": "I'm just looking, thanks. I'll let you know if I need help.", "fa": "فقط دارم نگاه می‌کنم، ممنون. اگه کمک خواستم می‌گم.", "level": "A2" },
          { "en": "Can I try this on? Where are the fitting rooms?", "fa": "میشه این رو پرو کنم؟ اتاق پرو کجاست؟", "level": "A2" },
          { "en": "This jacket is a bit too tight. Do you have it in a medium?", "fa": "این کت یه کم تنگه. سایز متوسطش رو دارید؟", "level": "B1" },
          { "en": "I'd like to return this pair of shoes. I have the receipt.", "fa": "می‌خوام این کفش رو پس بدم. رسیدم رو دارم.", "level": "B1" },
          { "en": "This feels like good quality. Is it on sale?", "fa": "به نظر کیفیت خوبی میاد. حراج هست؟", "level": "B2" },
          { "en": "I'll take this one. Can I pay by credit card?", "fa": "این یکی رو می‌خرم. می‌تونم با کارت اعتباری پرداخت کنم؟", "level": "A2" }
        ],
        "speakerB": [
          { "en": "It's $29.99.", "fa": "۲۹ دلار و ۹۹ سنت است.", "level": "A1" },
          { "en": "Let me check our stock in the back.", "fa": "بگذارید موجودی انبار رو چک کنم.", "level": "A2" },
          { "en": "Take your time. Just shout if you need anything.", "fa": "وقت بذارید. اگه چیزی خواستید صدا بزنید.", "level": "A2" },
          { "en": "Of course, they're right over there.", "fa": "حتماً، اونجا هستند.", "level": "A2" },
          { "en": "I think we have a medium. I'll bring it for you.", "fa": "فکر کنم سایز متوسط داریم. برات می‌آورم.", "level": "B1" },
          { "en": "No problem. Let me see the receipt. Would you like a refund or exchange?", "fa": "اشکالی نداره. بذارید رسید رو ببینم. پول نقد می‌خواید یا تعویض؟", "level": "B1" },
          { "en": "It's a new arrival, so it's not on sale yet.", "fa": "تازه وارد شده، پس هنوز حراج نیست.", "level": "B2" },
          { "en": "Yes, we accept all major credit cards.", "fa": "بله، همه کارت‌های اعتباری اصلی رو قبول می‌کنیم.", "level": "A2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 14: At a Hotel
  // ============================================================
  {
    "topic": "At a Hotel",
    "scenarios": [
      {
        "scenario": "Checking in and asking about facilities",
        "context": "Arriving at the hotel and checking in.",
        "speakerA": [
          { "en": "Hello, I have a reservation under the name Smith.", "fa": "سلام، من یه رزرو به اسم اسمیت دارم.", "level": "A2" },
          { "en": "What time is breakfast served?", "fa": "صبحانه چه ساعتی سرو می‌شه؟", "level": "A1" },
          { "en": "Is there a gym or swimming pool in the hotel?", "fa": "آیا هتل باشگاه یا استخر داره؟", "level": "A2" },
          { "en": "Could I have a room with a view, please?", "fa": "میشه یه اتاق با منظره داشته باشم؟", "level": "B1" },
          { "en": "The air conditioning in my room isn't working properly.", "fa": "سیستم تهویه اتاقم درست کار نمی‌کنه.", "level": "B1" },
          { "en": "I'd like a wake-up call at 7 AM tomorrow.", "fa": "فردا ساعت ۷ صبح زنگ بیدارباش می‌خوام.", "level": "B1" },
          { "en": "I'm afraid I lost my room key. Can I get a new one?", "fa": "متأسفم کلید اتاقم رو گم کردم. یه جدید می‌تونم بگیرم؟", "level": "B2" },
          { "en": "I'd like to check out now. Could I settle the bill?", "fa": "می‌خوام الان تسویه کنم. میشه صورتحساب رو تسویه کنم؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "Yes, Mr. Smith. Let me check you in. Here's your key.", "fa": "بله آقای اسمیت. بذارید ثبت ورودتون رو انجام بدم. کلیدتان بفرمایید.", "level": "A2" },
          { "en": "Breakfast is from 7 to 10 AM.", "fa": "صبحانه از ۷ تا ۱۰ صبح است.", "level": "A1" },
          { "en": "Yes, we have both on the ground floor.", "fa": "بله، هر دو در همکف موجود است.", "level": "A2" },
          { "en": "Let me see what we have available. I'll upgrade you.", "fa": "بذارید ببینم چی داریم. اتاقتان را ارتقا می‌دم.", "level": "B1" },
          { "en": "I'm sorry about that. I'll send a technician to fix it now.", "fa": "از این بابت متأسفم. یه تکنسین الان می‌فرستم تعمیرش کنه.", "level": "B1" },
          { "en": "Certainly, sir. We'll make sure you get your call.", "fa": "حتماً آقا. مطمئن می‌شیم که تماس بگیریم.", "level": "B1" },
          { "en": "Not a problem. I'll deactivate the old one and give you a new key.", "fa": "اشکالی نداره. قدیمی رو غیرفعال و یه کلید جدید بهتون می‌دم.", "level": "B2" },
          { "en": "Yes, of course. Let me print your final invoice.", "fa": "بله حتماً. بذارید فاکتور نهایی رو پرینت بگیرم.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 15: Health and Doctor's Visit
  // ============================================================
  {
    "topic": "Health and Doctor's Visit",
    "scenarios": [
      {
        "scenario": "Talking about symptoms and seeing a doctor",
        "context": "Feeling unwell and going to the pharmacy or doctor.",
        "speakerA": [
          { "en": "I don't feel well today. I think I'm coming down with something.", "fa": "امروز حالم خوب نیست. فکر کنم دارم مریض می‌شم.", "level": "A2" },
          { "en": "I have a headache and a sore throat.", "fa": "سردرد و گلودرد دارم.", "level": "A2" },
          { "en": "I need to see a doctor. Is there a clinic nearby?", "fa": "باید دکتر ببینم. درمانگاهی نزدیک اینجا هست؟", "level": "A2" },
          { "en": "Do you have anything for a cough and fever?", "fa": "برای سرفه و تب چیزی دارید؟", "level": "B1" },
          { "en": "I've been feeling nauseous all morning.", "fa": "تمام صبح حالم به هم خورده.", "level": "B1" },
          { "en": "I think I might have an allergic reaction to something I ate.", "fa": "فکر کنم به چیزی که خوردم واکنش آلرژیک دارم.", "level": "B2" },
          { "en": "I need to make an appointment with Dr. Johnson for this afternoon.", "fa": "باید برای امروز بعد از ظهر با دکتر جانسون وقت بگیرم.", "level": "B1" }
        ],
        "speakerB": [
          { "en": "You look pale. You should lie down and rest.", "fa": "رنگت پریده. باید دراز بکشی و استراحت کنی.", "level": "A2" },
          { "en": "That sounds awful. How long have you had these symptoms?", "fa": "وحشتناک به نظر میاد. این علائم رو چند وقته دارید؟", "level": "B1" },
          { "en": "Yes, there's a walk-in clinic just two blocks away.", "fa": "بله، یه درمانگاه بدون نوبت فقط دو خیابون اونورتره.", "level": "A2" },
          { "en": "I recommend this syrup for the cough and these tablets for fever.", "fa": "این شربت رو برای سرفه و این قرص‌ها رو برای تب توصیه می‌کنم.", "level": "B1" },
          { "en": "Have you tried drinking ginger tea? It helps with nausea.", "fa": "چای زنجبیل رو امتحان کردید؟ به حالت تهوع کمک می‌کنه.", "level": "B1" },
          { "en": "Stay calm. I'll call an ambulance if it gets worse.", "fa": "آروم باش. اگه بدتر شد آمبولانس می‌گیرم.", "level": "B2" },
          { "en": "He is fully booked today. The earliest slot is tomorrow morning at 10.", "fa": "امروز کاملاً پر است. اولین نوبت موجود فردا صبح ساعت ۱۰ هست.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 16: Asking for Directions / Landmarks
  // ============================================================
  {
    "topic": "Asking for Directions / Landmarks",
    "scenarios": [
      {
        "scenario": "Finding a specific place on foot or by car",
        "context": "A person is lost and asks a stranger for directions.",
        "speakerA": [
          { "en": "Excuse me, where is the nearest restroom?", "fa": "ببخشید، نزدیک‌ترین دستشویی کجاست؟", "level": "A1" },
          { "en": "How do I get to the National Museum from here?", "fa": "چطور از اینجا به موزه ملی برسم؟", "level": "A2" },
          { "en": "Is this the right way to the train station?", "fa": "آیا این راه درست برای رسیدن به ایستگاه قطاره؟", "level": "A2" },
          { "en": "Could you tell me where the nearest subway station is?", "fa": "میشه بگید نزدیک‌ترین ایستگاه مترو کجاست؟", "level": "B1" },
          { "en": "I'm looking for 5th Avenue. Am I anywhere close?", "fa": "دنبال خیابان پنجم می‌گردم. آیا نزدیکم؟", "level": "B1" },
          { "en": "Is there a pharmacy around here that's open 24 hours?", "fa": "آیا این حوالی داروخانه‌ای هست که ۲۴ ساعته باز باشه؟", "level": "B1" },
          { "en": "Could you please mark it on my map? I'm terrible with directions.", "fa": "میشه لطفاً روی نقشه‌ام علامت بزنید؟ من جهت‌یابی رو بلد نیستم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "It's just on the first floor, next to the elevator.", "fa": "همون طبقه اول، کنار آسانسوره.", "level": "A1" },
          { "en": "Go straight ahead for two blocks, then turn left. You can't miss it.", "fa": "دو بلوک برید مستقیم، بعد بپیچید چپ. پیداش می‌کنید.", "level": "A2" },
          { "en": "Actually, you're going the wrong way. You need to turn around.", "fa": "در واقع دارید اشتباه می‌رید. باید برگردید.", "level": "A2" },
          { "en": "Take the first right, then the second left. It's across from the bank.", "fa": "اولین خیابان رو برید راست، بعد دومی رو چپ. روبروی بانکه.", "level": "B1" },
          { "en": "You are quite close. It's about a 5-minute walk from here.", "fa": "نسبتاً نزدیکید. حدود ۵ دقیقه پیاده‌روی از اینجا فاصله داره.", "level": "B1" },
          { "en": "Yes, there's one on the corner of 2nd and Maple. It's always open.", "fa": "بله، یکی در گوشه خیابان دوم و میپل هست. همیشه بازه.", "level": "B1" },
          { "en": "Sure, let me draw the route for you. Go straight until you see a big fountain.", "fa": "حتماً، بذارید مسیر رو براتون بکشم. مستقیم برید تا یه فواره بزرگ ببینید.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 17: Plans and Free Time (Hobbies)
  // ============================================================
  {
    "topic": "Plans and Free Time (Hobbies)",
    "scenarios": [
      {
        "scenario": "Discussing weekend plans and hobbies",
        "context": "Talking about what to do in free time or upcoming events.",
        "speakerA": [
          { "en": "What are you doing this weekend?", "fa": "این آخر هفته چیکار می‌کنی؟", "level": "A1" },
          { "en": "Do you have any plans for the holiday?", "fa": "برای تعطیلات برنامه‌ای داری؟", "level": "A2" },
          { "en": "I'm thinking of going to the cinema. Would you like to join?", "fa": "دارم به سینما رفتن فکر می‌کنم. دوست داری بیای؟", "level": "A2" },
          { "en": "I usually play football with my friends on Saturdays.", "fa": "معمولاً شنبه‌ها با دوستام فوتبال بازی می‌کنم.", "level": "B1" },
          { "en": "I've taken up painting as a new hobby. It's quite relaxing.", "fa": "تازه نقاشی رو به عنوان یه سرگرمی شروع کردم. خیلی آرامش‌بخشه.", "level": "B2" },
          { "en": "Let's catch up over a coffee sometime. When are you free?", "fa": "یه وقتایی بریم یه قهوه بخوریم و گپ بزنیم. کی آزادی؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "I haven't decided yet. Probably just stay home and relax.", "fa": "هنوز تصمیم نگرفتم. احتمالاً فقط می‌مونم خونه و استراحت می‌کنم.", "level": "A1" },
          { "en": "I'm going to visit my parents. It's been a while.", "fa": "می‌رم به دیدار پدر و مادرم. مدتی هست که نرفتم.", "level": "A2" },
          { "en": "That sounds fun! What movie are you going to see?", "fa": "خوش می‌گذره! چه فیلمی می‌خواین ببینید؟", "level": "A2" },
          { "en": "That's great. I prefer hiking myself. Do you like nature?", "fa": "عالیه. من خودم پیاده‌روی تو کوه رو ترجیح می‌دم. طبیعت رو دوست داری؟", "level": "B1" },
          { "en": "Really? That's interesting. I've always wanted to learn how to paint.", "fa": "واقعاً؟ جالبه. من همیشه می‌خواستم نقاشی یاد بگیرم.", "level": "B2" },
          { "en": "I'm free on Wednesday after 4 PM. Let's meet at that new café downtown.", "fa": "چهارشنبه بعد از ۴ عصر آزادم. بیا همون کافه جدید مرکز شهر.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 18: Work and Workplace
  // ============================================================
  {
    "topic": "Work and Workplace",
    "scenarios": [
      {
        "scenario": "Talking about jobs and daily work routine",
        "context": "Colleagues or friends discuss their work and responsibilities.",
        "speakerA": [
          { "en": "Where do you work these days?", "fa": "این روزها کجا کار می‌کنی؟", "level": "A1" },
          { "en": "How many hours do you work a day?", "fa": "روزی چند ساعت کار می‌کنی؟", "level": "A2" },
          { "en": "Do you enjoy your job?", "fa": "از شغلت لذت می‌بری؟", "level": "A2" },
          { "en": "I've got a new project at work. It's really challenging.", "fa": "یه پروژه جدید سر کار گرفتم. واقعاً چالش‌برانگیزه.", "level": "B1" },
          { "en": "My boss is very understanding and supportive.", "fa": "رئیسم خیلی فهمیده و حامی است.", "level": "B2" },
          { "en": "I'm thinking about changing careers. I need a fresh start.", "fa": "به تغییر شغل فکر می‌کنم. یه شروع تازه نیاز دارم.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "I work at a bank downtown.", "fa": "توی یه بانک مرکز شهر کار می‌کنم.", "level": "A1" },
          { "en": "Usually around 8 hours, sometimes more.", "fa": "معمولاً حدود ۸ ساعت، بعضی وقتا بیشتر.", "level": "A2" },
          { "en": "Yes, I love it. It keeps me busy and I learn a lot.", "fa": "بله، عاشقشم. منو سرگرم می‌کنه و کلی یاد می‌گیرم.", "level": "A2" },
          { "en": "That sounds interesting! What's it about?", "fa": "به نظر جالب میاد! درباره‌ش چیه؟", "level": "B1" },
          { "en": "You're lucky. Mine is quite strict and demanding.", "fa": "خوش‌شانسی. مال من خیلی سخت‌گیر و پرتوقع است.", "level": "B2" },
          { "en": "That's a big decision. What field are you considering?", "fa": "تصمیم بزرگیه. به چه زمینه‌ای فکر می‌کنی؟", "level": "C1" }
        ]
      },
      {
        "scenario": "Meeting colleagues or work-related questions",
        "context": "In a meeting or office environment, asking about tasks and schedules.",
        "speakerA": [
          { "en": "Are you busy right now? Can I talk to you?", "fa": "الان مشغولی؟ می‌تونم باهات صحبت کنم؟", "level": "A2" },
          { "en": "What's on your to-do list for today?", "fa": "امروز چه کارهایی داری انجام بدی؟", "level": "B1" },
          { "en": "Could you help me with this report? I'm stuck on the third page.", "fa": "میشه تو این گزارش کمکم کنی؟ توی صفحه سوم گیر کردم.", "level": "B1" },
          { "en": "When is the deadline for this project?", "fa": "ددلاین این پروژه کیه؟", "level": "A2" },
          { "en": "I'm going to be late for work today. My car broke down.", "fa": "امروز سر کار دیر می‌رسیم. ماشینم خراب شده.", "level": "B1" },
          { "en": "Let's schedule a meeting for next Tuesday to go over the details.", "fa": "یه جلسه برای سه‌شنبه آینده بذاریم تا جزئیات رو مرور کنیم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Sure, come in. I have a few minutes.", "fa": "حتماً، بیا داخل. چند دقیقه وقت دارم.", "level": "A2" },
          { "en": "I have to finish the sales report and call some clients.", "fa": "باید گزارش فروش رو تموم کنم و به چندتا مشتری زنگ بزنم.", "level": "B1" },
          { "en": "Let me take a look. I think you missed a formula here.", "fa": "بذارید نگاه کنم. فکر کنم یه فرمول اینجا جا گذاشتید.", "level": "B1" },
          { "en": "The deadline is this Friday at 5 PM.", "fa": "ددلاین جمعه این هفته ساعت ۵ عصر است.", "level": "A2" },
          { "en": "No problem. Just let the team know so we can adjust.", "fa": "اشکالی نداره. به تیم خبر بده تا تنظیم کنیم.", "level": "B1" },
          { "en": "Perfect. I'll send out the invites shortly.", "fa": "عالیه. دعوت‌نامه‌ها رو به زودی می‌فرستم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 19: Time and Appointments
  // ============================================================
  {
    "topic": "Time and Appointments",
    "scenarios": [
      {
        "scenario": "Asking and telling the time and making appointments",
        "context": "People ask about time, set up meetings or get-togethers.",
        "speakerA": [
          { "en": "Excuse me, what time is it?", "fa": "ببخشید، ساعت چند است؟", "level": "A1" },
          { "en": "Do you have the time?", "fa": "ساعت داری؟", "level": "A1" },
          { "en": "When should we meet?", "fa": "کی باید همدیگر را ببینیم؟", "level": "A2" },
          { "en": "What time does the movie start?", "fa": "فیلم چه ساعتی شروع می‌شه؟", "level": "A2" },
          { "en": "Can we postpone our meeting to 3 PM? I'm running late.", "fa": "میشه جلسه‌مون رو به ساعت ۳ موکول کنیم؟ دارم دیر می‌شم.", "level": "B1" },
          { "en": "Let's confirm the date: Are we meeting on the 15th or the 16th?", "fa": "بیا تاریخ رو تأیید کنیم: جلسه ما پانزدهمه یا شانزدهم؟", "level": "B2" },
          { "en": "I'm free anytime after 4 PM. What suits you best?", "fa": "بعد از ۴ عصر هر وقتی آزادم. چه زمانی برات بهتره؟", "level": "B1" }
        ],
        "speakerB": [
          { "en": "It's 10:30.", "fa": "ساعت ۱۰:۳۰ است.", "level": "A1" },
          { "en": "I think my watch says 3:15.", "fa": "فکر کنم ساعت‌م ۳:۱۵ رو نشون میده.", "level": "A1" },
          { "en": "How about 6 o'clock in the evening?", "fa": "ساعت ۶ عصر چطوره؟", "level": "A2" },
          { "en": "It starts at 7 PM. We should leave at 6.", "fa": "ساعت ۷ شب شروع می‌شه. باید ساعت ۶ حرکت کنیم.", "level": "A2" },
          { "en": "Sure, 3 PM is fine. I'll adjust my schedule.", "fa": "حتماً، ساعت ۳ خوبه. برنامه‌ام رو تنظیم می‌کنم.", "level": "B1" },
          { "en": "I believe it's the 15th. Let me double-check my calendar.", "fa": "فکر می‌کنم پانزدهم باشه. بذارید تقویمم رو دوباره چک کنم.", "level": "B2" },
          { "en": "4 PM sounds perfect. I'll see you then.", "fa": "ساعت ۴ عالی به نظر میاد. پس همون موقع می‌بینمت.", "level": "B1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 20: Expressing Opinions and Feelings
  // ============================================================
  {
    "topic": "Expressing Opinions and Feelings",
    "scenarios": [
      {
        "scenario": "Sharing views on different topics",
        "context": "Two people discuss a movie, food, or event and give their opinion.",
        "speakerA": [
          { "en": "What do you think about this movie?", "fa": "نظرت درباره این فیلم چیه؟", "level": "A2" },
          { "en": "I really liked the food at that restaurant.", "fa": "من واقعاً غذاهای اون رستوران رو دوست داشتم.", "level": "A2" },
          { "en": "In my opinion, traveling is the best way to learn new cultures.", "fa": "به نظر من، سفر بهترین راه برای یادگیری فرهنگ‌های جدید است.", "level": "B1" },
          { "en": "I feel that we should focus more on our environment.", "fa": "احساس می‌کنم باید بیشتر روی محیط‌زیست تمرکز کنیم.", "level": "B2" },
          { "en": "To be honest, I'm not a big fan of horror movies. They scare me too much.", "fa": "راستش، من زیاد طرفدار فیلم‌های ترسناک نیستم. بیش از حد می‌ترسوننم.", "level": "B2" },
          { "en": "From my perspective, this decision will benefit the whole team.", "fa": "از دیدگاه من، این تصمیم به نفع کل تیم خواهد بود.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "It was okay. I liked the ending.", "fa": "بد نبود. از پایانش خوشم اومد.", "level": "A2" },
          { "en": "Me too! The pasta was delicious.", "fa": "منم همینطور! پاستاش عالی بود.", "level": "A2" },
          { "en": "I agree. You get to see how other people really live.", "fa": "موافقم. می‌بینی که مردم دیگه واقعاً چطور زندگی می‌کنن.", "level": "B1" },
          { "en": "That's true, but we also need to balance it with economic growth.", "fa": "درسته، اما باید با رشد اقتصادی هم تعادلش کنیم.", "level": "B2" },
          { "en": "I know what you mean. I prefer comedies; they lift my mood.", "fa": "می‌دونم منظورت چیه. من کمدی رو ترجیح می‌دم؛ روحیه‌م رو عالی می‌کنن.", "level": "B2" },
          { "en": "I see your point, but we should consider the risks involved as well.", "fa": "متوجه منظورت می‌شم، اما باید ریسک‌های مربوطه رو هم در نظر بگیریم.", "level": "C1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 21: Asking for Help and Clarification
  // ============================================================
  {
    "topic": "Asking for Help and Clarification",
    "scenarios": [
      {
        "scenario": "Requesting assistance or repetition",
        "context": "In daily life, asking someone for help or to repeat something.",
        "speakerA": [
          { "en": "Could you please help me with this bag? It's too heavy.", "fa": "میشه لطفاً تو این کیف کمکم کنی؟ خیلی سنگینه.", "level": "A1" },
          { "en": "I'm sorry, I didn't understand. Could you repeat that?", "fa": "ببخشید، متوجه نشدم. میشه دوباره بگید؟", "level": "A2" },
          { "en": "Could you speak a little more slowly, please?", "fa": "میشه لطفاً کمی آهسته‌تر صحبت کنید؟", "level": "A2" },
          { "en": "Would you mind helping me with this math problem?", "fa": "میشه کمکم کنید این مسئله ریاضی رو حل کنم؟", "level": "B1" },
          { "en": "I'm looking for the post office. Could you show me on the map?", "fa": "دنبال اداره پست می‌گردم. میشه روی نقشه نشونم بدید؟", "level": "B1" },
          { "en": "Do you have any idea how to get this application to work?", "fa": "نظری ندارید چطور این برنامه رو راه بندازم؟", "level": "B2" },
          { "en": "I hate to bother you, but could you lend me a pen for a moment?", "fa": "از اینکه مزاحم می‌شم خجالت می‌کشم، اما میشه یه لحظه خودکارتون رو قرض بگیرم؟", "level": "C1" }
        ],
        "speakerB": [
          { "en": "Sure, let me give you a hand.", "fa": "حتماً، بذارید کمک کنم.", "level": "A1" },
          { "en": "Of course. I said we need to finish the report by Friday.", "fa": "حتماً. گفتم باید گزارش رو تا جمعه تموم کنیم.", "level": "A2" },
          { "en": "Yes, sorry. I'll try to speak more clearly.", "fa": "بله، ببخشید. سعی می‌کنم واضح‌تر صحبت کنم.", "level": "A2" },
          { "en": "I can try, but it's been a while since I did math.", "fa": "می‌تونم امتحان کنم، اما مدتی هست ریاضی کار نکردم.", "level": "B1" },
          { "en": "Sure, it's right here. See this red marker?", "fa": "حتماً، اینجاست. این علامت قرمز رو می‌بینید؟", "level": "B1" },
          { "en": "Actually, you need to restart the computer first.", "fa": "در واقع، اول باید کامپیوتر رو ری‌استارت کنید.", "level": "B2" },
          { "en": "Not at all. Here you go.", "fa": "خواهش می‌کنم. بفرمایید.", "level": "C1" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 22: Politeness and Compliments
  // ============================================================
  {
    "topic": "Politeness and Compliments",
    "scenarios": [
      {
        "scenario": "Giving compliments and responding politely",
        "context": "People express appreciation or admiration towards others.",
        "speakerA": [
          { "en": "You look great today! Is that a new dress?", "fa": "امروز عالی به نظر می‌رسی! این یه لباس جدید هست؟", "level": "A2" },
          { "en": "I love your hair. It really suits you.", "fa": "موهات رو خیلی دوست دارم. خیلی بهت میاد.", "level": "A2" },
          { "en": "That was a really good presentation. You did a fantastic job!", "fa": "ارائه واقعاً خوبی بود. کار عالی انجام دادی!", "level": "B1" },
          { "en": "I must say, your house is beautifully decorated.", "fa": "باید بگم، خونه‌ات زیبا تزیین شده.", "level": "B1" },
          { "en": "You have a wonderful taste in music. This playlist is amazing.", "fa": "سلیقه‌ات در موسیقی فوق‌العاده است. این پلی‌لیست عالیه.", "level": "B2" },
          { "en": "I appreciate you helping me out so quickly. You're a lifesaver!", "fa": "ممنون که این سریع کمکم کردی. نجاتم دادی!", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Thanks! Yes, I got it last week.", "fa": "ممنون! آره، هفته پیش خریدمش.", "level": "A2" },
          { "en": "Oh, really? Thank you! I just styled it differently today.", "fa": "اوه، واقعاً؟ ممنون! امروز فقط یه جور دیگه حالتش دادم.", "level": "A2" },
          { "en": "Thank you so much! I was really nervous, so I'm glad it went well.", "fa": "خیلی ممنون! خیلی عصبی بودم، پس خوشحالم که خوب پیش رفت.", "level": "B1" },
          { "en": "That's very kind of you to say. I did it all myself!", "fa": "لطف دارید. خودم همه‌اش رو انجام دادم!", "level": "B1" },
          { "en": "Thank you! I'm glad you're enjoying it.", "fa": "ممنون! خوشحالم که ازش لذت می‌برید.", "level": "B2" },
          { "en": "Anytime! That's what friends are for.", "fa": "هر وقت! دوستان برای همین هستند.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 23: Travel and Experiences
  // ============================================================
  {
    "topic": "Travel and Experiences",
    "scenarios": [
      {
        "scenario": "Talking about past travels and experiences abroad",
        "context": "People share stories and memories of their trips.",
        "speakerA": [
          { "en": "Have you ever been to Italy?", "fa": "تا حالا به ایتالیا رفته‌ای؟", "level": "A2" },
          { "en": "What's the best place you've ever visited?", "fa": "بهترین جایی که تا حالا دیدی کجاست؟", "level": "B1" },
          { "en": "I went to Japan last year. It was an amazing experience!", "fa": "پارسال به ژاپن رفتم. تجربه فوق‌العاده‌ای بود!", "level": "B1" },
          { "en": "The food in Thailand was incredibly tasty and diverse.", "fa": "غذاهای تایلند فوق‌العاده خوشمزه و متنوع بود.", "level": "B2" },
          { "en": "I'd love to go hiking in the Alps someday. The scenery looks breathtaking.", "fa": "دوست دارم یه روزی تو کوه‌های آلپ پیاده‌روی کنم. منظره‌اش نفس‌گیر به نظر میاد.", "level": "C1" },
          { "en": "How did you find the people and culture in Mexico?", "fa": "مردم و فرهنگ مکزیک رو چطور دیدی؟", "level": "B2" }
        ],
        "speakerB": [
          { "en": "No, but I've always wanted to go there.", "fa": "نه، اما همیشه دوست داشتم برم اونجا.", "level": "A2" },
          { "en": "That's hard to choose! Maybe the beaches in Bali.", "fa": "انتخابش سخته! شاید سواحل بالی.", "level": "B1" },
          { "en": "Wow, I've heard so much about Japan. What did you like most?", "fa": "واو، کلی درباره ژاپن شنیدم. بیشتر از همه چی رو دوست داشتی؟", "level": "B1" },
          { "en": "I've been to Thailand too! The street food was my favorite.", "fa": "منم به تایلند رفته‌م! غذای خیابونی بیشتر از همه دوست داشتم.", "level": "B2" },
          { "en": "I have to say, the Swiss Alps are unforgettable. You should definitely go!", "fa": "باید بگم، آلپ سوئیس فراموش‌نشدنیه. حتماً باید بری!", "level": "C1" },
          { "en": "They were very friendly and welcoming. The food was a bit spicy for me though.", "fa": "خیلی دوستانه و خونگرم بودن. غذاها برام یه کم تند بودن.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // TOPIC 24: Apologies and Forgiveness
  // ============================================================
  {
    "topic": "Apologies and Forgiveness",
    "scenarios": [
      {
        "scenario": "Saying sorry and accepting apologies",
        "context": "Someone makes a mistake and apologizes, the other responds.",
        "speakerA": [
          { "en": "I'm so sorry! I didn't mean to step on your foot.", "fa": "خیلی متأسفم! عمداً پات رو نگذاشتم.", "level": "A2" },
          { "en": "I apologize for being late. The traffic was terrible.", "fa": "بابت دیر رسیدن عذرخواهی می‌کنم. ترافیک وحشتناک بود.", "level": "A2" },
          { "en": "I'm really sorry about the misunderstanding. It was my fault.", "fa": "واقعاً بابت سوءتفاهم معذرت می‌خوام. تقصیر من بود.", "level": "B1" },
          { "en": "Please forgive me for forgetting your birthday. I feel awful.", "fa": "ببخشید که تولدت رو فراموش کردم. حسابی شرمنده‌ام.", "level": "B1" },
          { "en": "I can't believe I broke your glass. I'll buy you a new one.", "fa": "باورم نمی‌شه لیوانت رو شکستم. یه جدید برات می‌خرم.", "level": "B1" },
          { "en": "I must apologize for my behavior yesterday. I was under a lot of stress.", "fa": "باید بابت رفتار دیروزم عذرخواهی کنم. خیلی تحت فشار بودم.", "level": "C1" }
        ],
        "speakerB": [
          { "en": "Oh, no problem at all! It was my fault for standing too close.", "fa": "اوه، اصلاً اشکالی نداره! تقصیر خودم بود که خیلی نزدیک ایستاده بودم.", "level": "A2" },
          { "en": "Don't worry about it. It happens to everyone.", "fa": "نگران نباش. برای همه پیش میاد.", "level": "A2" },
          { "en": "It's okay. I understand that you didn't mean it.", "fa": "اشکالی نداره. می‌دونم که عمدی نبود.", "level": "B1" },
          { "en": "Of course, I forgive you. Just don't do it again!", "fa": "حتماً، می‌بخشم. فقط دیگه تکرار نکن!", "level": "B1" },
          { "en": "That's very thoughtful of you. Thank you.", "fa": "خیلی با ملاحظه‌ای. ممنون.", "level": "B1" },
          { "en": "I appreciate the apology. Let's just move forward.", "fa": "از عذرخواهیت قدردانی می‌کنم. بذارین جلو بریم.", "level": "C1" }
        ]
      }
    ]
  }
];

// ============================================================
// THEMATIC CONVERSATIONS - COMPLETE
// ============================================================
export const THEMATIC_CONVERSATIONS = [
  // ============================================================
  // Topic 1: طبیعت (Nature)
  // ============================================================
  {
    "topic": "طبیعت (Nature)",
    "scenarios": [
      {
        "scenario": "Discussing a beautiful natural scene",
        "context": "Two people are looking at a beautiful landscape.",
        "speakerA": [
          { "en": "Wow, look at the view! It's amazing.", "fa": "واو، به این منظره نگاه کن! شگفت‌انگیزه.", "level": "A1" },
          { "en": "The mountains are so beautiful today.", "fa": "امروز کوه‌ها خیلی زیبا هستند.", "level": "A1" },
          { "en": "I love the sound of the birds singing.", "fa": "صدای آواز پرنده‌ها را دوست دارم.", "level": "A2" },
          { "en": "This reminds me of my trip to the Alps last year.", "fa": "این منو به سفرم به آلپ پارسال یاد می‌اندازه.", "level": "B1" },
          { "en": "It's so peaceful here, away from the city noise.", "fa": "اینجا خیلی آرومه، دور از سر و صدای شهر.", "level": "B1" },
          { "en": "We should protect these natural wonders for future generations.", "fa": "ما باید این عجایب طبیعی رو برای نسل‌های آینده حفظ کنیم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Yes, it's really beautiful!", "fa": "آره، واقعاً زیباست!", "level": "A1" },
          { "en": "I agree, the colors are so vibrant.", "fa": "موافقم، رنگ‌ها خیلی زنده هستند.", "level": "A1" },
          { "en": "Me too. It's so relaxing.", "fa": "منم همینطور. خیلی آرامش‌بخشه.", "level": "A2" },
          { "en": "Really? I've always wanted to go there.", "fa": "واقعاً؟ همیشه دوست داشتم به آنجا برم.", "level": "B1" },
          { "en": "Absolutely, it's refreshing to get some fresh air.", "fa": "دقیقاً، هوای تازه خوردن خیلی با طراوته.", "level": "B1" },
          { "en": "I couldn't agree more. We need to raise awareness.", "fa": "کاملاً موافقم. باید آگاهی‌بخشی کنیم.", "level": "B2" }
        ]
      },
      {
        "scenario": "Planning an outdoor activity",
        "context": "Two friends are planning a hike or a walk in nature.",
        "speakerA": [
          { "en": "Do you want to go for a walk in the park?", "fa": "می‌خوای بریم تو پارک قدم بزنیم؟", "level": "A1" },
          { "en": "Let's go hiking this weekend.", "fa": "بیا این آخر هفته بریم کوهنوردی.", "level": "A2" },
          { "en": "We should bring some snacks and water.", "fa": "باید یه خوراکی و آب با خودمون ببریم.", "level": "A2" },
          { "en": "I know a great trail with a beautiful waterfall.", "fa": "یه مسیر خوب با یه آبشار زیبا می‌شناسم.", "level": "B1" },
          { "en": "It's supposed to be sunny tomorrow, perfect for a picnic.", "fa": "فردا هوا آفتابی پیش‌بینی شده، برای پیک‌نیک عالیه.", "level": "B1" },
          { "en": "We should start early to avoid the midday heat.", "fa": "باید زود شروع کنیم تا از گرمای ظهر جلوگیری کنیم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Yes, I'd love to.", "fa": "آره، خیلی دوست دارم.", "level": "A1" },
          { "en": "That sounds like a great idea.", "fa": "به نظر ایده خوبی میاد.", "level": "A2" },
          { "en": "Good point. I'll bring some sandwiches.", "fa": "نکته خوبی گفتی. من چند تا ساندویچ می‌آرم.", "level": "A2" },
          { "en": "Really? That sounds amazing!", "fa": "واقعاً؟ عالی به نظر میاد!", "level": "B1" },
          { "en": "Perfect, I'll bring a blanket and some fruits.", "fa": "عالیه، من یه پتو و چند تا میوه می‌آرم.", "level": "B1" },
          { "en": "Absolutely, we don't want to get sunburned.", "fa": "دقیقاً، نمی‌خوایم آفتاب سوخته بشیم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // Topic 2: احساسات (Emotions)
  // ============================================================
  {
    "topic": "احساسات (Emotions)",
    "scenarios": [
      {
        "scenario": "Expressing happiness and excitement",
        "context": "One person shares good news and expresses joy.",
        "speakerA": [
          { "en": "I'm so happy today!", "fa": "امروز خیلی خوشحالم!", "level": "A1" },
          { "en": "I got a promotion at work!", "fa": "من در کار ترفیع گرفتم!", "level": "A2" },
          { "en": "I'm really excited about the trip.", "fa": "در مورد سفر خیلی هیجان‌زده هستم.", "level": "A2" },
          { "en": "I feel on top of the world right now.", "fa": "الان احساس می‌کنم روی اوج دنیا هستم.", "level": "B1" },
          { "en": "It's such a relief to finally have this done.", "fa": "اینقدر آرامش‌بخش است که بالاخره این کار تمام شد.", "level": "B1" },
          { "en": "I'm overjoyed by the support I've received.", "fa": "از حمایتی که دریافت کرده‌ام، بسیار خوشحالم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "That's great!", "fa": "عالیه!", "level": "A1" },
          { "en": "Congratulations! That's wonderful news!", "fa": "تبریک! چه خبر فوق‌العاده‌ای!", "level": "A2" },
          { "en": "I'm happy for you! Where are you going?", "fa": "به خاطرت خوشحالم! کجا می‌ری؟", "level": "A2" },
          { "en": "You deserve it! I'm so proud of you.", "fa": "شایسته‌اش هستی! به تو افتخار می‌کنم.", "level": "B1" },
          { "en": "I bet it feels great to have that weight off your shoulders.", "fa": "شرط می‌بندم حس خوبی داره که اون بار از روی دوشت برداشته شده.", "level": "B1" },
          { "en": "That's heartwarming to hear. You deserve it.", "fa": "شنیدنش دلگرم‌کننده است. شایسته‌اش هستی.", "level": "B2" }
        ]
      },
      {
        "scenario": "Expressing sadness and disappointment",
        "context": "Someone shares bad news or a difficult situation.",
        "speakerA": [
          { "en": "I'm feeling sad today.", "fa": "امروز احساس ناراحتی می‌کنم.", "level": "A1" },
          { "en": "I didn't get the job.", "fa": "من اون شغل رو به دست نیاوردم.", "level": "A2" },
          { "en": "I lost my wallet. I'm so upset.", "fa": "کیف پولم رو گم کردم. خیلی ناراحتم.", "level": "A2" },
          { "en": "I'm really disappointed with the result.", "fa": "از نتیجه واقعاً ناامید هستم.", "level": "B1" },
          { "en": "It's been a tough week, to be honest.", "fa": "راستش، هفته سختی بود.", "level": "B1" },
          { "en": "I feel a bit discouraged about the whole situation.", "fa": "در مورد کل وضعیت کمی دلسرد هستم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Oh no, what happened?", "fa": "اوه نه، چی شد؟", "level": "A1" },
          { "en": "I'm sorry to hear that. Don't give up.", "fa": "از شنیدن این خبر متاسفم. ناامید نشو.", "level": "A2" },
          { "en": "That's terrible. Can I help you look for it?", "fa": "این وحشتناکه. می‌تونم کمک کنم پیداش کنی؟", "level": "A2" },
          { "en": "I understand how you feel. It happens to everyone.", "fa": "متوجه احساس تو می‌شوم. برای همه پیش می‌آید.", "level": "B1" },
          { "en": "If you need to talk, I'm here for you.", "fa": "اگه نیاز به صحبت داری، من اینجام.", "level": "B1" },
          { "en": "That's understandable. It's okay to feel that way.", "fa": "قابل درک است. اشکالی نداره که اینطور احساس کنی.", "level": "B2" }
        ]
      },
      {
        "scenario": "Expressing anger and frustration",
        "context": "Someone is upset about a situation or a person.",
        "speakerA": [
          { "en": "I'm so angry!", "fa": "خیلی عصبانی هستم!", "level": "A1" },
          { "en": "My phone isn't working again.", "fa": "گوشی من دوباره کار نمی‌کنه.", "level": "A2" },
          { "en": "I can't believe he said that to me.", "fa": "باورم نمی‌شه اون حرف رو به من زد.", "level": "A2" },
          { "en": "It's really frustrating when people don't listen.", "fa": "وقتی مردم گوش نمی‌دهند واقعاً آزاردهنده است.", "level": "B1" },
          { "en": "I'm furious about the way I was treated.", "fa": "از طرز برخوردی که با من شد، خیلی عصبانی هستم.", "level": "B1" },
          { "en": "This situation is driving me crazy.", "fa": "این وضعیت داره دیوونم می‌کنه.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Calm down. Take a deep breath.", "fa": "آروم باش. یه نفس عمیق بکش.", "level": "A1" },
          { "en": "That's so annoying!", "fa": "این خیلی آزاردهنده است!", "level": "A2" },
          { "en": "I understand why you're upset.", "fa": "می‌دونم چرا ناراحتی.", "level": "A2" },
          { "en": "I know, it can be very irritating.", "fa": "می‌دونم، می‌تونه خیلی آزاردهنده باشه.", "level": "B1" },
          { "en": "You have every right to be angry.", "fa": "تو کاملاً حق داری عصبانی باشی.", "level": "B1" },
          { "en": "Try to look at it from a different perspective.", "fa": "سعی کن از یه زاویه دیگه بهش نگاه کنی.", "level": "B2" }
        ]
      },
      {
        "scenario": "Expressing fear and anxiety",
        "context": "Someone is scared or worried about something.",
        "speakerA": [
          { "en": "I'm scared of the dark.", "fa": "از تاریکی می‌ترسم.", "level": "A1" },
          { "en": "I have a big exam tomorrow. I'm so nervous.", "fa": "فردا امتحان بزرگی دارم. خیلی عصبی هستم.", "level": "A2" },
          { "en": "I'm worried about my friend. She's sick.", "fa": "نگران دوستم هستم. مریض است.", "level": "A2" },
          { "en": "I'm anxious about the presentation next week.", "fa": "در مورد ارائه هفته آینده مضطرب هستم.", "level": "B1" },
          { "en": "I have a fear of heights. It's quite limiting.", "fa": "از ارتفاع می‌ترسم. خیلی محدودکننده است.", "level": "B1" },
          { "en": "The uncertainty of the future makes me uneasy.", "fa": "عدم قطعیت آینده باعث نگرانی من می‌شود.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Don't be afraid.", "fa": "نترس.", "level": "A1" },
          { "en": "You'll do great. Just relax.", "fa": "عالی عمل می‌کنی. فقط آروم باش.", "level": "A2" },
          { "en": "I hope she gets better soon.", "fa": "امیدوارم زود خوب بشه.", "level": "A2" },
          { "en": "Just take a deep breath and prepare well.", "fa": "فقط یه نفس عمیق بکش و خوب آماده شو.", "level": "B1" },
          { "en": "That's a common fear. There are ways to manage it.", "fa": "این یک ترس رایجه. راه‌هایی برای مدیریتش وجود داره.", "level": "B1" },
          { "en": "I know, it can be a lot to handle.", "fa": "می‌دونم، می‌تونه زیاد باشه برای مدیریت.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // Topic 3: اعضای بدن (Body Parts)
  // ============================================================
  {
    "topic": "اعضای بدن انسان (Body Parts)",
    "scenarios": [
      {
        "scenario": "Describing body parts and pain",
        "context": "Two people talk about physical health and body parts.",
        "speakerA": [
          { "en": "My head hurts. I have a headache.", "fa": "سرم درد می‌کند. سردرد دارم.", "level": "A1" },
          { "en": "My back is aching from sitting all day.", "fa": "کمرم از نشستن تمام روز درد می‌کند.", "level": "A2" },
          { "en": "I hurt my knee while playing football.", "fa": "هنگام فوتبال بازی کردن زانوی من آسیب دید.", "level": "A2" },
          { "en": "The doctor checked my heart and lungs.", "fa": "دکتر قلب و ریه‌های من را معاینه کرد.", "level": "B1" },
          { "en": "I need to strengthen my arms and shoulders.", "fa": "من باید بازوها و شانه‌هایم را تقویت کنم.", "level": "B1" },
          { "en": "My neck is stiff from looking at my phone.", "fa": "گردنم از نگاه کردن به گوشی خشک شده است.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "Take a painkiller and rest.", "fa": "یک مسکن بخور و استراحت کن.", "level": "A1" },
          { "en": "You should sit with better posture.", "fa": "باید با وضعیت بهتری بنشینی.", "level": "A2" },
          { "en": "Be careful next time. Protect your knees.", "fa": "دفعه بعد مراقب باش. از زانوهایت محافظت کن.", "level": "A2" },
          { "en": "That's good that you got them checked.", "fa": "خوب است که آنها را معاینه کردی.", "level": "B1" },
          { "en": "You should do some weight training.", "fa": "باید تمرینات وزنه‌ای انجام دهی.", "level": "B1" },
          { "en": "Take a break and stretch your neck.", "fa": "یک استراحت کن و گردنت را بکش.", "level": "B2" }
        ]
      },
      {
        "scenario": "Talking about exercise and body parts",
        "context": "People discuss fitness and which muscles they're working.",
        "speakerA": [
          { "en": "I exercise my legs by running.", "fa": "من با دویدن پاهایم را تمرین می‌دهم.", "level": "A1" },
          { "en": "Push-ups are good for your arms and chest.", "fa": "شنای سوئدی برای بازوها و سینه مفید است.", "level": "A2" },
          { "en": "I need to work on my stomach and core.", "fa": "من باید روی شکم و میان‌تنه‌ام کار کنم.", "level": "A2" },
          { "en": "Squats strengthen your thighs and glutes.", "fa": "اسکوات ران‌ها و باسن را تقویت می‌کند.", "level": "B1" },
          { "en": "Yoga is great for flexibility and your whole body.", "fa": "یوگا برای انعطاف‌پذیری و تمام بدن عالی است.", "level": "B1" },
          { "en": "I've been focusing on my upper body recently.", "fa": "اخیراً روی بالاتنه تمرکز کرده‌ام.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "That's great for your heart too.", "fa": "این برای قلب شما هم عالی است.", "level": "A1" },
          { "en": "I should try those exercises.", "fa": "من باید آن تمرینات را امتحان کنم.", "level": "A2" },
          { "en": "Ab workouts are very important.", "fa": "تمرینات شکم بسیار مهم هستند.", "level": "A2" },
          { "en": "I do squats every day too.", "fa": "من هم هر روز اسکوات انجام می‌دهم.", "level": "B1" },
          { "en": "I've heard yoga is very beneficial.", "fa": "شنیده‌ام که یوگا بسیار مفید است.", "level": "B1" },
          { "en": "I prefer training my lower body.", "fa": "من تمرین دادن پایین‌تنه را ترجیح می‌دهم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // Topic 4: ماه‌ها و زمان (Months and Time)
  // ============================================================
  {
    "topic": "ماه‌ها و زمان (Months and Time)",
    "scenarios": [
      {
        "scenario": "Talking about dates and plans",
        "context": "People discuss upcoming events and dates.",
        "speakerA": [
          { "en": "My birthday is in January.", "fa": "تولد من در ماه ژانویه است.", "level": "A1" },
          { "en": "I have a meeting on the 15th of March.", "fa": "من در تاریخ ۱۵ مارس جلسه دارم.", "level": "A2" },
          { "en": "The conference is in the first week of April.", "fa": "کنفرانس در هفته اول آوریل است.", "level": "A2" },
          { "en": "I'll be on vacation in August this year.", "fa": "من امسال در ماه اوت در تعطیلات خواهم بود.", "level": "B1" },
          { "en": "We need to finish the project by the end of September.", "fa": "ما باید پروژه را تا پایان سپتامبر تمام کنیم.", "level": "B1" },
          { "en": "The product launch is scheduled for October 20th.", "fa": "راه‌اندازی محصول برای ۲۰ اکتبر برنامه‌ریزی شده است.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "When exactly is your birthday?", "fa": "تولد شما دقیقاً کی است؟", "level": "A1" },
          { "en": "What time is the meeting?", "fa": "جلسه چه ساعتی است؟", "level": "A2" },
          { "en": "Is it in early April?", "fa": "آیا در اوایل آوریل است؟", "level": "A2" },
          { "en": "That's a good time to travel.", "fa": "این زمان خوبی برای سفر است.", "level": "B1" },
          { "en": "That's coming up soon. We should get started.", "fa": "آن به زودی فرا می‌رسد. باید شروع کنیم.", "level": "B1" },
          { "en": "I have it marked on my calendar.", "fa": "من آن را در تقویم خود علامت زده‌ام.", "level": "B2" }
        ]
      },
      {
        "scenario": "Discussing seasons and months",
        "context": "Talking about weather and activities in different months.",
        "speakerA": [
          { "en": "January is very cold here.", "fa": "اینجا ژانویه بسیار سرد است.", "level": "A1" },
          { "en": "I love spring, especially April and May.", "fa": "من بهار را دوست دارم، به ویژه آوریل و می.", "level": "A2" },
          { "en": "My favorite month is October.", "fa": "ماه مورد علاقه من اکتبر است.", "level": "A2" },
          { "en": "July and August are perfect for beach holidays.", "fa": "ژوئیه و اوت برای تعطیلات ساحلی عالی هستند.", "level": "B1" },
          { "en": "We get a lot of rain in November and December.", "fa": "ما در نوامبر و دسامبر باران زیادی داریم.", "level": "B1" },
          { "en": "The best time to visit is June or September.", "fa": "بهترین زمان برای بازدید ژوئن یا سپتامبر است.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "I prefer warmer months.", "fa": "من ماه‌های گرمتر را ترجیح می‌دهم.", "level": "A1" },
          { "en": "Spring is beautiful indeed.", "fa": "بهار واقعاً زیبا است.", "level": "A2" },
          { "en": "I like October too. The colors are amazing.", "fa": "من هم اکتبر را دوست دارم. رنگ‌ها شگفت‌انگیز هستند.", "level": "A2" },
          { "en": "I agree, summer is my favorite season.", "fa": "موافقم، تابستان فصل مورد علاقه من است.", "level": "B1" },
          { "en": "That sounds like you need an umbrella.", "fa": "به نظر می‌رسد به چتر نیاز داری.", "level": "B1" },
          { "en": "We should plan our trip for June.", "fa": "ما باید سفر خود را برای ژوئن برنامه‌ریزی کنیم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // Topic 5: اعداد (Numbers)
  // ============================================================
  {
    "topic": "اعداد (Numbers)",
    "scenarios": [
      {
        "scenario": "Counting from 1 to 100",
        "context": "Learning and using numbers in daily life.",
        "speakerA": [
          { "en": "I have one cat and two dogs.", "fa": "من یک گربه و دو سگ دارم.", "level": "A1" },
          { "en": "I live with three people.", "fa": "من با سه نفر زندگی می‌کنم.", "level": "A1" },
          { "en": "There are four chairs in this room.", "fa": "چهار صندلی در این اتاق وجود دارد.", "level": "A1" },
          { "en": "Five days to the weekend!", "fa": "پنج روز تا آخر هفته!", "level": "A1" },
          { "en": "I need six eggs for the recipe.", "fa": "من برای این دستور پخت شش تخم‌مرغ نیاز دارم.", "level": "A2" },
          { "en": "We have seven meetings today.", "fa": "ما امروز هفت جلسه داریم.", "level": "A2" },
          { "en": "There are eight planets in our solar system.", "fa": "هشت سیاره در منظومه شمسی ما وجود دارد.", "level": "A2" },
          { "en": "I need nine people for the team.", "fa": "من برای تیم به نه نفر نیاز دارم.", "level": "B1" },
          { "en": "I have ten fingers and ten toes.", "fa": "من ده انگشت دست و ده انگشت پا دارم.", "level": "B1" },
          { "en": "There are twenty students in my class.", "fa": "بیست دانش‌آموز در کلاس من هستند.", "level": "B1" }
        ],
        "speakerB": [
          { "en": "I have one sister.", "fa": "من یک خواهر دارم.", "level": "A1" },
          { "en": "I live with two friends.", "fa": "من با دو دوست زندگی می‌کنم.", "level": "A1" },
          { "en": "Three people are coming to dinner.", "fa": "سه نفر برای شام می‌آیند.", "level": "A1" },
          { "en": "Four more days until my holiday.", "fa": "چهار روز دیگر تا تعطیلات من.", "level": "A1" },
          { "en": "I have five books on my shelf.", "fa": "من پنج کتاب در قفسه‌ام دارم.", "level": "A2" },
          { "en": "Six pizzas is enough for everyone.", "fa": "شش پیتزا برای همه کافی است.", "level": "A2" },
          { "en": "Seven days in a week.", "fa": "هفت روز در هفته.", "level": "A2" },
          { "en": "Eight hours of sleep is recommended.", "fa": "هشت ساعت خواب توصیه می‌شود.", "level": "B1" },
          { "en": "Nine people joined the club.", "fa": "نه نفر به باشگاه پیوستند.", "level": "B1" },
          { "en": "Ten minutes to go!", "fa": "ده دقیقه مانده!", "level": "B1" }
        ]
      },
      {
        "scenario": "Using numbers in shopping",
        "context": "Dealing with prices and quantities while shopping.",
        "speakerA": [
          { "en": "How much is this?", "fa": "این چند است؟", "level": "A1" },
          { "en": "This jacket is $45.", "fa": "این کت ۴۵ دلار است.", "level": "A2" },
          { "en": "I need two of these and three of those.", "fa": "من به دو عدد از این و سه عدد از آن نیاز دارم.", "level": "A2" },
          { "en": "The total is $78.50.", "fa": "مجموع ۷۸ دلار و ۵۰ سنت است.", "level": "B1" },
          { "en": "I want to buy 5 shirts and 3 pairs of shoes.", "fa": "من می‌خواهم ۵ پیراهن و ۳ جفت کفش بخرم.", "level": "B1" },
          { "en": "We have a 20% discount on all items.", "fa": "ما ۲۰٪ تخفیف روی همه اقلام داریم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "It's $10.", "fa": "۱۰ دلار است.", "level": "A1" },
          { "en": "That's a bit expensive.", "fa": "این کمی گران است.", "level": "A2" },
          { "en": "I'll take four of these.", "fa": "من چهار عدد از این را می‌گیرم.", "level": "A2" },
          { "en": "That comes to $80 exactly.", "fa": "دقیقاً ۸۰ دلار می‌شود.", "level": "B1" },
          { "en": "I have 4 items in my cart.", "fa": "من ۴ کالا در سبد خرید خود دارم.", "level": "B1" },
          { "en": "Let me calculate the discount.", "fa": "بگذارید تخفیف را محاسبه کنم.", "level": "B2" }
        ]
      }
    ]
  },
  // ============================================================
  // Topic 6: شخصیت (Personality Traits)
  // ============================================================
  {
    "topic": "شخصیت و صفات (Personality Traits)",
    "scenarios": [
      {
        "scenario": "Describing personality traits",
        "context": "People talk about their own or others' characters.",
        "speakerA": [
          { "en": "I am a friendly and outgoing person.", "fa": "من یک فرد خوش‌برخورد و برون‌گرا هستم.", "level": "A1" },
          { "en": "My sister is very creative and artistic.", "fa": "خواهرم بسیار خلاق و هنرمند است.", "level": "A2" },
          { "en": "My father is very honest and hardworking.", "fa": "پدرم بسیار صادق و سخت‌کوش است.", "level": "A2" },
          { "en": "I am quite introverted and need time alone.", "fa": "من نسبتاً درون‌گرا هستم و به زمان تنهایی نیاز دارم.", "level": "B1" },
          { "en": "She has a very optimistic outlook on life.", "fa": "او دیدگاه بسیار خوش‌بینانه‌ای به زندگی دارد.", "level": "B1" },
          { "en": "I tend to be perfectionist in my work.", "fa": "من در کار خود کمال‌گرا هستم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "That's a great quality.", "fa": "این یک ویژگی عالی است.", "level": "A1" },
          { "en": "She sounds like a wonderful person.", "fa": "به نظر یک فرد فوق‌العاده می‌رسد.", "level": "A2" },
          { "en": "Those are admirable traits.", "fa": "این‌ها ویژگی‌های ستودنی هستند.", "level": "A2" },
          { "en": "I understand. I'm similar in that way.", "fa": "متوجه می‌شوم. من هم در آن زمینه مشابه هستم.", "level": "B1" },
          { "en": "It's good to see the positive side of things.", "fa": "خوب است که جنبه مثبت چیزها را ببینیم.", "level": "B1" },
          { "en": "Being a perfectionist can be both a blessing and a curse.", "fa": "کمال‌گرا بودن می‌تواند هم نعمت باشد و هم نقمت.", "level": "B2" }
        ]
      },
      {
        "scenario": "Talking about strengths and weaknesses",
        "context": "People discuss their personal qualities and areas for improvement.",
        "speakerA": [
          { "en": "I am good at listening to people.", "fa": "من در گوش دادن به مردم خوب هستم.", "level": "A1" },
          { "en": "My strength is problem-solving.", "fa": "نقطه قوت من حل مسئله است.", "level": "A2" },
          { "en": "I need to be more organized.", "fa": "من باید منظم‌تر باشم.", "level": "A2" },
          { "en": "I lack patience sometimes.", "fa": "من گاهی صبر ندارم.", "level": "B1" },
          { "en": "My biggest weakness is procrastination.", "fa": "بزرگترین ضعف من به تعویق انداختن کارها است.", "level": "B1" },
          { "en": "I'm always willing to learn and improve.", "fa": "من همیشه مایل به یادگیری و پیشرفت هستم.", "level": "B2" }
        ],
        "speakerB": [
          { "en": "That's very helpful.", "fa": "این بسیار مفید است.", "level": "A1" },
          { "en": "That's a valuable skill.", "fa": "این یک مهارت ارزشمند است.", "level": "A2" },
          { "en": "Maybe you can use a planner app.", "fa": "شاید بتوانی از یک برنامه برنامه‌ریزی استفاده کنی.", "level": "A2" },
          { "en": "I understand, I have that problem too.", "fa": "متوجه می‌شوم، من هم آن مشکل را دارم.", "level": "B1" },
          { "en": "Procrastination is common. You can overcome it.", "fa": "به تعویق انداختن کارها رایج است. می‌توانی بر آن غلبه کنی.", "level": "B1" },
          { "en": "That growth mindset is really inspiring.", "fa": "آن ذهنیت رشد واقعاً الهام‌بخش است.", "level": "B2" }
        ]
      }
    ]
  }
];

// ============================================================
// SINGLE EXPORT DEFAULT - FIXED
// ============================================================
export default {
  DAILY_CONVERSATIONS,
  THEMATIC_CONVERSATIONS
};