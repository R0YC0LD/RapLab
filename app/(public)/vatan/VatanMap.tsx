"use client";

import Link from "next/link";
import {
  cloneElement,
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type SVGProps,
} from "react";
import { ArrowUpRight, MapPin, Navigation, UsersRound } from "lucide-react";
import TurkeyMap, { type CityType } from "turkey-map-react";
import { svgPathBbox } from "svg-path-bbox";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import {
  TURKEY_CITIES,
  TURKEY_CITY_BY_ID,
  TURKEY_REGIONS,
  cityDescription,
  findTurkeyCity,
} from "@/lib/turkey/cities";
import styles from "./vatan.module.css";

interface MapArtist {
  id: string;
  stage_name: string;
  slug: string;
  city: string | null;
  genres: string[];
  profile_image_path: string;
  follower_count: number;
}

interface LabelGeometry {
  x: number;
  y: number;
  fontSize: number;
  dotY: number;
}

const labelGeometryCache = new Map<string, LabelGeometry>();

const LABEL_OFFSETS: Record<string, readonly [number, number]> = {
  canakkale: [4, 4],
  istanbul: [0, -2],
  kocaeli: [1, 1],
  yalova: [0, 5],
};

function getLabelGeometry(city: CityType): LabelGeometry {
  const cached = labelGeometryCache.get(city.id);
  if (cached) return cached;

  const [minX, minY, maxX, maxY] = svgPathBbox(city.path);
  const width = maxX - minX;
  const height = maxY - minY;
  const [offsetX, offsetY] = LABEL_OFFSETS[city.id] ?? [0, 0];
  const nameLength = Math.max(city.name.length, 5);
  const fontSize = Math.max(3.5, Math.min(8.2, width / (nameLength * 0.58), height * 0.26));
  const x = minX + width / 2 + offsetX;
  const y = minY + height / 2 + fontSize * 0.32 + offsetY;
  const geometry = { x, y, fontSize, dotY: y + fontSize * 1.2 };
  labelGeometryCache.set(city.id, geometry);
  return geometry;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
}

export function VatanMap({ artists }: { artists: MapArtist[] }) {
  const artistsByCity = useMemo(() => {
    const grouped = new Map<string, MapArtist[]>();
    for (const artist of artists) {
      const city = findTurkeyCity(artist.city);
      if (!city) continue;
      const cityArtists = grouped.get(city.id) ?? [];
      cityArtists.push(artist);
      grouped.set(city.id, cityArtists);
    }
    for (const cityArtists of grouped.values()) {
      cityArtists.sort((a, b) => b.follower_count - a.follower_count);
    }
    return grouped;
  }, [artists]);

  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    const firstPopulatedCity = TURKEY_CITIES.find((city) => artistsByCity.has(city.id));
    return firstPopulatedCity?.id ?? "istanbul";
  });

  const selectedCity = TURKEY_CITY_BY_ID[selectedCityId] ?? TURKEY_CITY_BY_ID.istanbul;
  const cityArtists = artistsByCity.get(selectedCity.id) ?? [];
  const representedCityCount = artistsByCity.size;
  const topGenres = Array.from(new Set(cityArtists.flatMap((artist) => artist.genres))).slice(0, 4);

  const selectCity = useCallback((cityId: string) => {
    setSelectedCityId(cityId);
  }, []);

  const wrapCity = useCallback(
    (element: ReactElement, mapCity: CityType) => {
      const city = TURKEY_CITY_BY_ID[mapCity.id];
      if (!city) return element;

      const geometry = getLabelGeometry(mapCity);
      const artistCount = artistsByCity.get(city.id)?.length ?? 0;
      const selected = city.id === selectedCityId;
      const group = element as ReactElement<SVGProps<SVGGElement>>;

      const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectCity(city.id);
      };

      const interactiveProps = {
          className: styles.cityShape,
          "data-region": city.region,
          "data-has-artists": artistCount > 0 ? "true" : "false",
          "data-selected": selected ? "true" : "false",
          role: "button",
          tabIndex: 0,
          "aria-label": `${city.name}, ${artistCount} doğrulanmış sanatçı`,
          onKeyDown,
        } as SVGProps<SVGGElement>;

      return cloneElement(
        group,
        interactiveProps,
        group.props.children,
        <text
          key="city-label"
          className={styles.cityLabel}
          x={geometry.x}
          y={geometry.y}
          style={{ fontSize: geometry.fontSize }}
          textAnchor="middle"
          aria-hidden="true"
        >
          {city.name.toLocaleUpperCase("tr-TR")}
        </text>,
        artistCount > 0 ? (
          <circle
            key="artist-dot"
            className={styles.artistDot}
            cx={geometry.x}
            cy={geometry.dotY}
            r={Math.max(1.5, geometry.fontSize * 0.25)}
            aria-hidden="true"
          />
        ) : null
      );
    },
    [artistsByCity, selectCity, selectedCityId]
  );

  return (
    <div className={`${styles.page} page-enter`}>
      <section className={styles.intro} aria-labelledby="vatan-title">
        <div>
          <p className={styles.eyebrow}>RAPLAB TR / 81 ŞEHİR</p>
          <h1 id="vatan-title" className={styles.title}>
            VATAN
          </h1>
          <p className={styles.lead}>
            Türkiye rap sahnesini şehir şehir keşfet. Haritadan bir il seç, o şehrin sesini
            taşıyan doğrulanmış sanatçılara doğrudan ulaş.
          </p>
        </div>
        <dl className={styles.metrics} aria-label="Vatan arşivi özeti">
          <div>
            <dt>İL</dt>
            <dd>81</dd>
          </div>
          <div>
            <dt>SAHNESİ KAYITLI</dt>
            <dd>{representedCityCount}</dd>
          </div>
          <div>
            <dt>SANATÇI</dt>
            <dd>{artists.filter((artist) => findTurkeyCity(artist.city)).length}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.explorer} aria-label="İnteraktif Türkiye sanatçı haritası">
        <div className={styles.mapPanel}>
          <div className={styles.mapToolbar}>
            <div className={styles.mapHint}>
              <Navigation size={17} aria-hidden="true" />
              <span>Şehri seç</span>
            </div>
            <label className={styles.cityPicker}>
              <span className="sr-only">Şehir seç</span>
              <select
                value={selectedCity.id}
                onChange={(event) => selectCity(event.target.value)}
              >
                {TURKEY_CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {String(city.plate).padStart(2, "0")} · {city.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.mapScroll}>
            <div className={styles.mapCanvas}>
              <TurkeyMap
                showTooltip={false}
                customStyle={{ idleColor: "#25282f", hoverColor: "#ff5f68" }}
                cityWrapper={wrapCity}
                onClick={(city) => selectCity(city.id)}
              />
            </div>
          </div>

          <div className={styles.legend} aria-label="Harita açıklaması">
            <span><i className={styles.legendArtist} /> Sanatçı bulunan şehir</span>
            <span><i className={styles.legendSelected} /> Seçili şehir</span>
            <span>Renkler coğrafi bölgeleri ayırır</span>
          </div>
        </div>

        <aside className={styles.cityPanel} aria-live="polite">
          <div className={styles.cityHeading}>
            <span className={styles.plate}>{String(selectedCity.plate).padStart(2, "0")}</span>
            <div>
              <p>{TURKEY_REGIONS[selectedCity.region].label}</p>
              <h2>{selectedCity.name}</h2>
            </div>
          </div>

          <p className={styles.cityDescription}>{cityDescription(selectedCity)}</p>

          <div className={styles.cityStats}>
            <span><UsersRound size={16} aria-hidden="true" /> {cityArtists.length} sanatçı</span>
            {topGenres.map((genre) => <span key={genre}>{genre}</span>)}
          </div>

          <div className={styles.artistSection}>
            <div className={styles.artistSectionTitle}>
              <h3>Şehrin sanatçıları</h3>
              <span>{cityArtists.length}</span>
            </div>

            {cityArtists.length > 0 ? (
              <div className={styles.artistList}>
                {cityArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/sanatci/${artist.slug}`}
                    className={styles.artistRow}
                  >
                    <Avatar
                      src={artist.profile_image_path}
                      alt={artist.stage_name}
                      size={46}
                    />
                    <span className={styles.artistIdentity}>
                      <strong>{artist.stage_name} <VerifiedBadge size={16} /></strong>
                      <small>
                        {artist.genres.slice(0, 2).join(" · ") || "Rap"} · {formatCount(artist.follower_count)} takipçi
                      </small>
                    </span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCity}>
                <MapPin size={22} aria-hidden="true" />
                <p>Bu şehir için henüz doğrulanmış bir sanatçı kaydı yok.</p>
                <Link href="/sanatci-basvurusu">Bu şehri haritaya taşı</Link>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
