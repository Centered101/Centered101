"use client";

import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { videos } from "@/lib/shop/mockData";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlayCircle } from "@fortawesome/free-solid-svg-icons";

const platformColors: Record<string, string> = {
  TikTok: "bg-foreground text-background",
  Instagram: "bg-pink-500 text-white",
  YouTube: "bg-red-600 text-white",
};

const VideoSection = () => {
  const { language, t } = useLanguage();

  return (
    <section id="videos" className="py-12 bg-muted/30">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">{t("section.videos")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {videos.map((video, i) => (
            <motion.a
              key={video.id}
              href={video.url}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group block rounded-xl overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow"
            >
              <div className="relative">
                <img src={video.thumbnail} alt={video.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 group-hover:bg-foreground/30 transition-colors">
                  <span className="text-4xl">
                    <FontAwesomeIcon icon={faPlayCircle} className="text-primary bg-background rounded-full p-2 w-10 h-10 shadow-lg" />
                  </span>
                </div>
                <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${platformColors[video.platform]}`}>
                  {video.platform}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{language === "th" ? video.titleTh : video.title}</h3>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
