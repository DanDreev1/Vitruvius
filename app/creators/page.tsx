import { getTranslations } from 'next-intl/server';

import Header from '@/components/ui/Header';
import ScaledPageViewport from '@/components/layout/ScaledPageViewport';

export default async function CreatorsPage() {
  const t = await getTranslations('Creators');
  const developers = [
    {
      name: 'Daniil Andrieiev',
      role: t('daniilRole'),
      description: t('daniilDescription'),
      portfolioHref: 'https://my-portfolio-six-xi-85.vercel.app',
    },
    {
      name: 'Yevhenii Andrieieiv',
      role: t('yevheniiRole'),
      description: t('yevheniiDescription'),
      portfolioHref: null,
    },
  ];

  return (
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />
      <main className="creators-compact mx-auto flex h-[780px] w-full max-w-[1440px] overflow-y-auto px-10 py-10">
        <section className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
          <div className="text-center">
            <h1 className="font-montserrat-alt text-[62px] font-extrabold leading-none tracking-[-0.04em] text-[#D6B25E]">{t('title')}</h1>
            <p className="mx-auto mt-3 max-w-[700px] font-montserrat text-[17px] font-medium leading-[1.5] text-[#A7A9B4]">{t('intro')}</p>
          </div>

          <div className="rounded-[24px] bg-[#182135] p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-montserrat-alt text-[32px] font-extrabold text-white">{t('gratitude')}</h2>
                <p className="mt-2 font-montserrat text-[14px] font-semibold uppercase tracking-[0.12em] text-[#D6B25E] sm:text-[15px]">{t('inspirationName')}</p>
              </div>
              <p className="font-montserrat text-[16px] leading-[1.6] text-[#E3E5EB]">{t('inspirationDescription')}</p>
              <div className="flex flex-wrap gap-3">
                <a href="https://gryadut.ru/" target="_blank" rel="noreferrer" className="btn-primary min-h-[54px] !w-auto px-8 py-4 font-montserrat-alt text-[16px] font-extrabold sm:min-h-[58px] sm:text-[17px]">{t('visitWebsite')}</a>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#182135] p-6">
            <div className="mb-5 md:mb-6">
              <h2 className="font-montserrat-alt text-[32px] font-extrabold text-white">{t('developers')}</h2>
              <p className="mt-2 font-montserrat text-[14px] leading-[1.55] text-[#A7A9B4]">{t('developersDescription')}</p>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-5">
              {developers.map((developer) => (
                <article key={developer.name} className="flex h-full flex-col rounded-[20px] bg-[#0F172A] p-4">
                  <div><h3 className="font-montserrat-alt text-[23px] font-extrabold text-white">{developer.name}</h3><p className="mt-1 font-montserrat text-[13px] font-semibold text-[#D6B25E]">{developer.role}</p></div>
                  <p className="mt-3 font-montserrat text-[14px] leading-[1.55] text-[#E3E5EB]">{developer.description}</p>
                  <div className="mt-auto pt-5">
                    {developer.portfolioHref ? <a href={developer.portfolioHref} target="_blank" rel="noreferrer" className="btn-secondary min-h-[52px] !w-full px-7 py-4 font-montserrat-alt text-[15px] font-extrabold sm:text-[16px]">{t('portfolio')}</a> : <button type="button" disabled className="btn-secondary min-h-[52px] !w-full cursor-not-allowed px-7 py-4 font-montserrat-alt text-[15px] font-extrabold opacity-60 sm:text-[16px]">{t('portfolio')}</button>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </ScaledPageViewport>
  );
}
