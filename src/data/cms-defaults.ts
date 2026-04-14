import {
  footerDocLinks,
  footerNavLinks,
  footerSocialLinks,
  galleryItems,
  heroSlides,
  navigationItems,
  newsItems,
  testimonials,
} from "@/data/site-content";

export type NavLink = { label: string; href: string };

export type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
};

export type GalleryItem = {
  title: string;
  caption: string;
  image: string;
};

export type NewsItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  content: string;
};

export type Testimonial = {
  name: string;
  text: string;
  rating: string;
};

export type PromoOffer = {
  id: string;
  tag: string;
  title: string;
  description: string;
  benefit: string;
  validUntil: string;
  terms: string;
  cta: string;
  href: string;
  image: string;
  usedBy: string;
};

export type LiveStreamItem = {
  id: string;
  title: string;
  url: string;
};

export type LiveStreamsSection = {
  badge: string;
  title: string;
  description: string;
  streams: LiveStreamItem[];
};

export type HomeGallerySection = {
  badge: string;
  title: string;
  description: string;
  ctaText: string;
};

export type HomePromotionsSection = {
  badge: string;
  title: string;
  description: string;
};

export type HomeNewsSection = {
  badge: string;
  title: string;
  description: string;
  allNewsCta: string;
};

export type HomeUiText = {
  galleryMainLabel: string;
  reviewsAverageLabel: string;
  reviewsCardLabel: string;
  reviewsEmptyTitle: string;
  reviewsEmptyDescription: string;
  newsFeaturedLabel: string;
  newsReadMoreLabel: string;
};

export type PaymentRequisites = {
  recipient: string;
  iban: string;
  bank: string;
  purpose: string;
};

export type AdminContactCard = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  phone: string;
  telegram?: string;
  photo: string;
};

export type StatItem = {
  targetValue: number;
  decimals: number;
  suffix: string;
  outOf: string;
  label: string;
  description: string;
  isThousands: boolean;
};

export type StatsSection = {
  badge: string;
  title: string;
  description: string;
  items: StatItem[];
};

export type ReviewsSection = {
  badge: string;
  title: string;
  ratingTitle: string;
  ratingSubtitle: string;
  ctaText: string;
  allReviewsCta: string;
};

export type CmsContent = {
  siteName: string;
  logoUrl: string;
  navigationItems: NavLink[];
  heroMode: "video" | "slides";
  heroBadge: string;
  heroVideoUrl: string;
  heroSlides: HeroSlide[];
  galleryItems: GalleryItem[];
  newsItems: NewsItem[];
  testimonials: Testimonial[];
  footerNavLinks: NavLink[];
  footerDocLinks: NavLink[];
  footerSocialLinks: NavLink[];
  promoOffers: PromoOffer[];
  liveStreamsSection: LiveStreamsSection;
  homeGallerySection: HomeGallerySection;
  homePromotionsSection: HomePromotionsSection;
  homeNewsSection: HomeNewsSection;
  homeUiText: HomeUiText;
  statsSection: StatsSection;
  reviewsSection: ReviewsSection;
  paymentRequisites: PaymentRequisites;
  adminContacts: AdminContactCard[];
};

export const cmsDefaults: CmsContent = {
  siteName: "FCDL.STORE",
  logoUrl: "",
  navigationItems,
  heroMode: "video",
  heroBadge: "Онлайн-бронювання поля",
  heroVideoUrl: "/img/background.mp4",
  heroSlides,
  galleryItems,
  newsItems,
  testimonials,
  footerNavLinks,
  footerDocLinks,
  footerSocialLinks,
  promoOffers: [
    {
      id: "weekday-prime",
      tag: "Головна акція",
      title: "Вигідні будні: спеціальна ціна до 17:00",
      description: "Зручний варіант для тренувань у будні дні, коли потрібно стабільний слот за кращою ціною.",
      benefit: "Спецціна у будні",
      validUntil: "Актуально цього місяця",
      terms: "Пн-Пт, денні години. Деталі уточнюйте під час бронювання.",
      cta: "Перейти до бронювання",
      href: "#booking",
      image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1800&q=80",
      usedBy: "Зручно для регулярних тренувань",
    },
    {
      id: "fullfield-bonus",
      tag: "Спецпропозиція",
      title: "Вечірні слоти за фіксованою ціною",
      description: "Оптимально для команд, які збираються після роботи та хочуть планувати бюджет без сюрпризів.",
      benefit: "Фіксована вартість",
      validUntil: "Актуально цього тижня",
      terms: "Пн-Чт, 19:00-22:00. Кількість слотів обмежена.",
      cta: "Перейти до бронювання",
      href: "#booking",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1800&q=80",
      usedBy: "Популярний вечірній формат",
    },
    {
      id: "newteam-start",
      tag: "Спецпропозиція",
      title: "Ранкові години для тренувань за спецумовами",
      description: "Для команд, яким підходять ранні тренування: більше вільних слотів і комфортний темп.",
      benefit: "Ранковий тариф",
      validUntil: "Актуально цього місяця",
      terms: "Щодня до 12:00. Доступність залежить від розкладу.",
      cta: "Перейти до бронювання",
      href: "#booking",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1800&q=80",
      usedBy: "Більше вільних ранкових слотів",
    },
  ],
  liveStreamsSection: {
    badge: "Камери",
    title: "Дивіться онлайн трансляції матчів",
    description: "Обирайте потрібну камеру та дивіться матч у прямому ефірі. Усі трансляції доступні прямо на сторінці.",
    streams: [
      {
        id: "stream-1",
        title: "Трансляція 1",
        url: "https://www.youtube.com/watch?v=6dOp2sXsopI",
      },
      {
        id: "stream-2",
        title: "Трансляція 2",
        url: "https://www.youtube.com/watch?v=2PhXiuIeVuk",
      },
      {
        id: "stream-3",
        title: "Трансляція 3",
        url: "https://www.youtube.com/watch?v=JNQvXt81V9U",
      },
    ],
  },
  homeGallerySection: {
    badge: "Галерея",
    title: "Реальний настрій поля",
    description: "Атмосфера матчів, зона поля та фотозвіти з ігор на одній сторінці.",
    ctaText: "Дивитися все",
  },
  homePromotionsSection: {
    badge: "Акції",
    title: "Актуальні пропозиції",
    description: "Спеціальні умови для регулярних матчів, командних тренувань та повноформатних ігор.",
  },
  homeNewsSection: {
    badge: "Новини",
    title: "Останні оновлення",
    description: "Актуальні анонси, зміни розкладу та важливі апдейти по матчах і сервісу.",
    allNewsCta: "Усі новини",
  },
  homeUiText: {
    galleryMainLabel: "Головний кадр",
    reviewsAverageLabel: "Середня оцінка",
    reviewsCardLabel: "Відгук клієнта",
    reviewsEmptyTitle: "Відгуки клієнтів",
    reviewsEmptyDescription: "Поки що немає опублікованих відгуків. Після завершення матчу клієнти можуть залишити відгук у своєму кабінеті.",
    newsFeaturedLabel: "Головна новина",
    newsReadMoreLabel: "Детальніше",
  },
  statsSection: {
    badge: "Статистика",
    title: "Сервіс у цифрах",
    description: "Реальні показники, що відображають масштаб та якість роботи майданчика.",
    items: [
      {
        targetValue: 1280,
        decimals: 0,
        suffix: "+",
        outOf: "",
        label: "бронювань",
        description: "Успішних бронювань з моменту запуску сервісу",
        isThousands: true,
      },
      {
        targetValue: 740,
        decimals: 0,
        suffix: "+",
        outOf: "",
        label: "клієнтів",
        description: "Команд і гравців що обрали наш майданчик",
        isThousands: false,
      },
      {
        targetValue: 4.9,
        decimals: 1,
        suffix: "",
        outOf: "/ 5",
        label: "рейтинг",
        description: "Середня оцінка за якість поля та сервіс",
        isThousands: false,
      },
    ],
  },
  reviewsSection: {
    badge: "Відгуки",
    title: "Рейтинг сервісу",
    ratingSubtitle: "На основі оцінок гравців і команд",
    ratingTitle: "Відгуки клієнтів",
    ctaText: "Залишити відгук",
    allReviewsCta: "Усі відгуки",
  },
  paymentRequisites: {
    recipient: "ФОП Іваненко Іван Іванович",
    iban: "UA123456789012345678901234567",
    bank: "АТ КБ ПриватБанк",
    purpose: "Оплата за бронювання поля FCDL.STORE",
  },
  adminContacts: [
    {
      id: "admin-1",
      name: "Адміністрація поля",
      description: "Єдиний контакт для бронювання, оплати та уточнення деталей матчу.",
      phone: "+380670000000",
      photo: "",
    },
  ],
};
