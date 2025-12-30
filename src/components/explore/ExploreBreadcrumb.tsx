import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface ExploreBreadcrumbProps {
  domain?: string;
  subDomain?: string;
  specialization?: string;
  onClearDomain: () => void;
  onClearSubDomain: () => void;
  onClearSpecialization: () => void;
}

export const ExploreBreadcrumb = ({
  domain,
  subDomain,
  specialization,
  onClearDomain,
  onClearSubDomain,
  onClearSpecialization,
}: ExploreBreadcrumbProps) => {
  const { t } = useTranslation();
  
  if (!domain) return null;

  return (
    <div className="animate-in fade-in duration-300">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={onClearDomain}
              className="cursor-pointer hover:text-foreground flex items-center gap-1"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{t('explore.allDomains')}</span>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            {subDomain ? (
              <BreadcrumbLink 
                onClick={onClearSubDomain}
                className="cursor-pointer hover:text-foreground"
              >
                {domain}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{domain}</BreadcrumbPage>
            )}
          </BreadcrumbItem>

          {subDomain && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {specialization ? (
                  <BreadcrumbLink 
                    onClick={onClearSpecialization}
                    className="cursor-pointer hover:text-foreground"
                  >
                    {subDomain}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{subDomain}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}

          {specialization && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{specialization}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
