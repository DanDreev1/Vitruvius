import Header from '@/components/ui/Header';
import ScaledPageViewport from '@/components/layout/ScaledPageViewport';

const gratitudeBlock = {
  title: 'Грядут Приключения',
  description:
    'Эта страница посвящена благодарности команде Грядут Приключения за вдохновение, атмосферу и любовь к системе Витрувий, которые подтолкнули нас к созданию этого цифрового стола.',
  websiteLabel: 'Перейти на сайт',
  websiteHref: 'https://gryadut.ru/',
};

const developers = [
  {
    name: 'Daniil Andrieiev',
    role: 'Full Stack Developer, Founder',
    description:
      'Отвечал за общую логику сайта и его дизайн и был Team Lead этого проекта.',
    portfolioLabel: 'Портфолио',
    portfolioHref: 'https://my-portfolio-six-xi-85.vercel.app',
  },
  {
    name: 'Yevhenii Andrieieiv',
    role: 'Full Stack Developer, Co-Founder',
    description:
      'Отвечает за разработку некоторых страниц, является одним из создателей и движущей частью этого сайта',
    portfolioLabel: 'Портфолио',
    portfolioHref: null,
  },
];

export default function CreatorsPage() {
  return (
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />

      <main className="creators-compact mx-auto flex h-[780px] w-full max-w-[1440px] overflow-y-auto px-10 py-10">
        <section className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
          <div className="text-center">
            <h1 className="font-montserrat-alt text-[62px] font-extrabold leading-none tracking-[-0.04em] text-[#D6B25E]">
              Creators
            </h1>

            <p className="font-montserrat mx-auto mt-3 max-w-[700px] text-[17px] font-medium leading-[1.5] text-[#A7A9B4]">
              Здесь собрана благодарность тем, кто вдохновил нас на создание
              сайта, а также информация о разработчиках Vitruvius.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#182135] p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-montserrat-alt text-[32px] font-extrabold text-white">
                  Благодарность
                </h2>

                <p className="font-montserrat mt-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#D6B25E] sm:text-[15px]">
                  {gratitudeBlock.title}
                </p>
              </div>

              <p className="font-montserrat text-[16px] leading-[1.6] text-[#E3E5EB]">
                {gratitudeBlock.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href={gratitudeBlock.websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary font-montserrat-alt !w-auto min-h-[54px] px-8 py-4 text-[16px] font-extrabold sm:min-h-[58px] sm:text-[17px]"
                >
                  {gratitudeBlock.websiteLabel}
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#182135] p-6">
            <div className="mb-5 md:mb-6">
              <h2 className="font-montserrat-alt text-[32px] font-extrabold text-white">
                Разработчики сайта
              </h2>

              <p className="font-montserrat mt-2 text-[14px] leading-[1.55] text-[#A7A9B4]">
                Люди, которые работают над цифровой адаптацией Vitruvius.
              </p>
            </div>

            <div className="grid grid-cols-2 items-stretch gap-5">
              {developers.map((developer) => (
                <article
                  key={developer.name}
                  className="flex h-full flex-col rounded-[20px] bg-[#0F172A] p-4"
                >
                  <div>
                    <h3 className="font-montserrat-alt text-[23px] font-extrabold text-white">
                      {developer.name}
                    </h3>

                    <p className="font-montserrat mt-1 text-[13px] font-semibold text-[#D6B25E]">
                      {developer.role}
                    </p>
                  </div>

                  <p className="font-montserrat mt-3 text-[14px] leading-[1.55] text-[#E3E5EB]">
                    {developer.description}
                  </p>

                  <div className="mt-auto pt-5">
                    {developer.portfolioHref ? (
                        <a
                            href={developer.portfolioHref}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary font-montserrat-alt !w-full min-h-[52px] px-7 py-4 text-[15px] font-extrabold sm:text-[16px]"
                        >
                            {developer.portfolioLabel}
                        </a>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="btn-secondary font-montserrat-alt !w-full min-h-[52px] cursor-not-allowed px-7 py-4 text-[15px] font-extrabold opacity-60 sm:text-[16px]"
                        >
                            {developer.portfolioLabel}
                        </button>
                    )}
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
