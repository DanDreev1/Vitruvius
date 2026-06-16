'use client';

export default function SceneMusicPage() {
  const items = [
    { id: '1', title: 'Song’s name' },
    { id: '2', title: 'Song’s name' },
    { id: '3', title: 'Song’s name' },
    { id: '4', title: 'Song’s name', active: true },
  ];

  return (
    <div className="flex h-full w-full flex-col">
      <h2 className="mb-[28px] font-montserrat-alt text-[34px] font-extrabold text-white">
        Playlist
      </h2>

      <div className="flex flex-1 flex-col gap-[14px] overflow-hidden">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[26px] border border-white bg-transparent px-[16px] py-[18px]"
          >
            <div className="flex items-center gap-[18px]">
              <div className="h-[66px] w-[66px] rounded-full bg-white/90" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                  {item.title}
                </p>

                {item.active ? (
                  <div className="mt-[16px] flex items-center gap-[16px]">
                    <div className="h-[8px] flex-1 rounded-full bg-white/90">
                      <div className="h-full w-[48%] rounded-full bg-white" />
                    </div>

                    <div className="flex items-center gap-[12px] text-white">
                      <span className="text-[24px]">◀</span>
                      <span className="text-[24px]">⏸</span>
                      <span className="text-[24px]">▶</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        <div className="pt-[10px]">
          <button
            type="button"
            className="rounded-[14px] bg-white px-[26px] py-[12px] font-montserrat text-[18px] font-bold text-black"
          >
            Add music
          </button>
        </div>
      </div>
    </div>
  );
}