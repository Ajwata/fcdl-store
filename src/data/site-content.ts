export const navigationItems = [
  { label: "Головна", href: "/" },
  { label: "Галерея", href: "/#gallery" },
  { label: "Відгуки", href: "/#reviews" },
  { label: "Трансляція", href: "/#live" },
  { label: "Бронювання", href: "/booking" },
];

export const heroHighlights = [
  "3 сектори або все поле",
  "Живий розклад без накладок",
  "Швидке бронювання зі смартфона",
];

export const heroStats = [
  { value: "1280+", label: "зіграних матчів" },
  { value: "4.9/5", label: "середня оцінка клієнтів" },
  { value: "06:00-22:00", label: "графік у вихідні" },
];

export const landingFeatures = [
  {
    title: "Гнучке бронювання",
    text: "Оберіть дату, слот і сектор, а система одразу покаже доступність без дзвінків і ручних уточнень.",
  },
  {
    title: "Прозорі тарифи",
    text: "Будні, вихідні, денний і вечірній час одразу видно у вартості, без прихованих доплат.",
  },
  {
    title: "Контроль матчів",
    text: "Історія оплат, статуси матчів і відгуки зібрані в одному продукті для клієнта й адміністратора.",
  },
];

export const sectors = [
  { name: "Лівий сектор", price: "від 900 грн", status: "Є слоти сьогодні" },
  { name: "Центральний сектор", price: "від 1100 грн", status: "Прайм-тайм майже зайнятий" },
  { name: "Правий сектор", price: "від 900 грн", status: "Зручно для вечірньої гри" },
  { name: "Усе поле", price: "від 2500 грн", status: "Для повноформатних матчів" },
];

export const galleryItems = [
  {
    title: "Вечірній матч під світлом",
    caption: "Повнорозмірне освітлення і комфортна зона біля поля.",
    image:
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Сектори для форматів 6x6 та 8x8",
    caption: "Швидко зібрати гру на частині поля або забрати всю арену.",
    image:
      "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Якісне покриття та догляд",
    caption: "Поле підготовлене до щоденних матчів і тренувань.",
    image:
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Командна атмосфера",
    caption: "Простір, який працює і для аматорських матчів, і для корпоративних ліг.",
    image:
      "https://images.unsplash.com/photo-1543357480-c60d40007a3f?auto=format&fit=crop&w=1200&q=80",
  },
];

export const testimonials = [
  {
    name: "Олександр, капітан команди",
    text: "Найзручніше, що більше не треба в чатах шукати вільний час. Відкрив, побачив слот і одразу забронював.",
    rating: "5.0",
  },
  {
    name: "Ірина, менеджер турнірів",
    text: "Подобається, що видно повну картину по секторах. Для організації регулярних ігор це реально економить час.",
    rating: "4.9",
  },
  {
    name: "Максим, клієнт",
    text: "Інтерфейс простий навіть з телефону. Окремий плюс за те, що одразу видно вартість вечірніх слотів.",
    rating: "5.0",
  },
];

export const liveFeatures = [
  "Вбудована YouTube Live трансляція на сторінці",
  "Останні результати та анонси матчів поруч",
  "Архів записів і найяскравіші моменти матчів",
];

export const footerLinks = [
  { label: "Умови оренди", href: "#" },
  { label: "Політика оплати", href: "#" },
  { label: "Контакти", href: "#" },
];

export const bookingDays = [
  { id: 1, label: "Сьогодні", date: "26 бер", weekday: "Ср" },
  { id: 2, label: "Завтра", date: "27 бер", weekday: "Чт" },
  { id: 3, label: "П'ятниця", date: "28 бер", weekday: "Пт" },
  { id: 4, label: "Субота", date: "29 бер", weekday: "Сб" },
  { id: 5, label: "Неділя", date: "30 бер", weekday: "Нд" },
  { id: 6, label: "Понеділок", date: "31 бер", weekday: "Пн" },
];

export const bookingSectors = ["Лівий", "Центр", "Правий", "Усе поле"] as const;

export const bookingSlots = [
  { time: "15:00", left: "Вільно", center: "Зайнято", right: "Вільно", full: "Недоступно" },
  { time: "16:00", left: "Вільно", center: "Вільно", right: "Вільно", full: "Доступно" },
  { time: "17:00", left: "Зайнято", center: "Вільно", right: "Вільно", full: "Недоступно" },
  { time: "18:00", left: "Зайнято", center: "Зайнято", right: "Вільно", full: "Недоступно" },
  { time: "19:00", left: "Вільно", center: "Вільно", right: "Зайнято", full: "Недоступно" },
  { time: "20:00", left: "Вільно", center: "Вільно", right: "Вільно", full: "Доступно" },
  { time: "21:00", left: "Вільно", center: "Вільно", right: "Вільно", full: "Доступно" },
];