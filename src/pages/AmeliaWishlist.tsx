import { useState, useEffect } from "react";
import { Gift, ExternalLink, Heart, PartyPopper, Cake, Star } from "lucide-react";

interface GiftItem {
  id: number;
  name: string;
  description: string;
  image: string;
  orderUrl: string;
  price?: string;
}

const gifts: GiftItem[] = [
  {
    id: 1,
    name: "Набор Hello Kitty для творчества",
    description: "Большой набор для рисования и творчества с Hello Kitty — фломастеры, краски, наклейки",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "2 500 ₽",
  },
  {
    id: 2,
    name: "Мягкая игрушка Hello Kitty",
    description: "Плюшевая Hello Kitty в розовом платье, 40 см",
    image: "https://images.unsplash.com/photo-1559715541-5daf8a0296d0?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "1 800 ₽",
  },
  {
    id: 3,
    name: "Рюкзак Hello Kitty",
    description: "Розовый рюкзачок с Hello Kitty для прогулок и садика",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "3 200 ₽",
  },
  {
    id: 4,
    name: "Набор детской посуды Hello Kitty",
    description: "Тарелка, кружка и столовые приборы с Hello Kitty",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "1 500 ₽",
  },
  {
    id: 5,
    name: "Конструктор Hello Kitty",
    description: "Красочный конструктор «Домик Hello Kitty» — 150 деталей",
    image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "2 800 ₽",
  },
  {
    id: 6,
    name: "Книжки с наклейками Hello Kitty",
    description: "Комплект из 3 книжек с наклейками и заданиями",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    orderUrl: "#",
    price: "900 ₽",
  },
];

const STORAGE_KEY = "amelia-wishlist-reserved";

const AmeliaWishlist = () => {
  const [reserved, setReserved] = useState<Record<number, boolean>>({});
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setReserved(JSON.parse(saved));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const toggleReserve = (id: number) => {
    setAnimatingId(id);
    setTimeout(() => setAnimatingId(null), 600);

    setReserved((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reservedCount = Object.values(reserved).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-orange-50">
      {/* Decorative floating elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-5 text-pink-200 animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>
          <Heart size={24} fill="currentColor" />
        </div>
        <div className="absolute top-20 right-10 text-rose-200 animate-bounce" style={{ animationDelay: "1s", animationDuration: "4s" }}>
          <Star size={20} fill="currentColor" />
        </div>
        <div className="absolute top-40 left-[15%] text-pink-100 animate-bounce" style={{ animationDelay: "2s", animationDuration: "3.5s" }}>
          <Heart size={16} fill="currentColor" />
        </div>
        <div className="absolute top-60 right-[20%] text-orange-200 animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "4.5s" }}>
          <Star size={18} fill="currentColor" />
        </div>
      </div>

      {/* Header */}
      <header className="relative pt-8 pb-6 px-4 text-center">
        {/* Hello Kitty bow decoration */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-pink-200">
              <span className="text-4xl" role="img" aria-label="Hello Kitty">🎀</span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-pink-600 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
          С Днём Рождения, Амелия!
        </h1>
        <div className="flex items-center justify-center gap-2 text-pink-400 mb-3">
          <PartyPopper size={20} />
          <span className="text-lg font-medium">Виш-лист подарков</span>
          <Cake size={20} />
        </div>
        <p className="text-pink-400/80 text-sm max-w-md mx-auto">
          Выберите подарок для нашей маленькой принцессы! Нажмите «Забронировать», чтобы другие гости знали, что этот подарок уже выбран 💖
        </p>

        {reservedCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-4 py-2 rounded-full text-sm font-medium">
            <Gift size={16} />
            Забронировано: {reservedCount} из {gifts.length}
          </div>
        )}
      </header>

      {/* Gift Grid */}
      <main className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gifts.map((gift) => {
            const isReserved = reserved[gift.id];
            const isAnimating = animatingId === gift.id;

            return (
              <div
                key={gift.id}
                className={`
                  relative rounded-2xl overflow-hidden bg-white shadow-md
                  transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                  border-2 ${isReserved ? "border-pink-300 opacity-75" : "border-pink-100"}
                  ${isAnimating ? "scale-95" : "scale-100"}
                `}
                style={{ transition: "all 0.3s ease" }}
              >
                {/* Reserved overlay */}
                {isReserved && (
                  <div className="absolute top-3 right-3 z-10 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                    <Heart size={12} fill="white" />
                    Забронировано
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 bg-pink-100 overflow-hidden">
                  <img
                    src={gift.image}
                    alt={gift.name}
                    className={`w-full h-full object-cover transition-all duration-300 ${isReserved ? "grayscale-[30%]" : "hover:scale-105"}`}
                    loading="lazy"
                  />
                  {/* Kitty paw decoration */}
                  <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-pink-500 font-medium">
                    🐱 Hello Kitty
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-1">{gift.name}</h3>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{gift.description}</p>

                  {gift.price && (
                    <div className="text-pink-600 font-bold text-lg mb-3">
                      {gift.price}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <a
                      href={gift.orderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <ExternalLink size={14} />
                      Где купить
                    </a>
                    <button
                      onClick={() => toggleReserve(gift.id)}
                      className={`
                        flex-1 flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md
                        ${
                          isReserved
                            ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            : "bg-gradient-to-r from-orange-300 to-pink-300 hover:from-orange-400 hover:to-pink-400 text-white"
                        }
                      `}
                    >
                      <Heart size={14} fill={isReserved ? "none" : "currentColor"} />
                      {isReserved ? "Отменить" : "Забронировать"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8 px-4">
        <div className="flex items-center justify-center gap-2 text-pink-300 mb-2">
          <div className="h-px w-12 bg-pink-200" />
          <span className="text-2xl">🎀</span>
          <div className="h-px w-12 bg-pink-200" />
        </div>
        <p className="text-pink-400/60 text-sm">
          С любовью для Амелии 💕
        </p>
      </footer>
    </div>
  );
};

export default AmeliaWishlist;
