import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faCapsules,
  faHandshake,
  faLeaf,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

const iconByCategoryId: Record<string, IconDefinition> = {
  health: faCapsules,
  beauty: faWandMagicSparkles,
  lifestyle: faLeaf,
  tech: faBolt,
  partner: faHandshake,
};

export function CategoryIcon({ id, className }: { id: string; className?: string }) {
  const icon = iconByCategoryId[id] ?? faLeaf;
  return <FontAwesomeIcon icon={icon} className={className} />;
}
