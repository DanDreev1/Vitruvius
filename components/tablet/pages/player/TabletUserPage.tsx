'use client';

import Image from 'next/image';

type TabletUserPageProps = {
  isEditable: boolean;
};

const descriptionText =
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

export default function TabletUserPage({ isEditable }: TabletUserPageProps) {
  return (
    <div className="grid h-full grid-cols-[350px_minmax(0,1fr)] gap-[46px]">
      <div className="flex items-start justify-center pt-[4px]">
        <button
          type="button"
          disabled={!isEditable}
          className="relative flex h-[500px] w-[350px] items-center justify-center overflow-hidden rounded-[26px] bg-[#D9D9D9] disabled:cursor-default"
          title={isEditable ? "Upload character image" : "Character image"}
        >
          <Image src="/UploadImage.png" alt="" width={72} height={72} />
        </button>
      </div>

      <section className="max-w-[720px] pt-[4px] text-white">
        <h2 className="font-montserrat-alt text-[32px] font-extrabold leading-none">
          Description
        </h2>

        <p className="mt-[28px] font-montserrat text-[22px] font-semibold leading-[1.2] text-white">
          {descriptionText}
        </p>
      </section>
    </div>
  );
}
