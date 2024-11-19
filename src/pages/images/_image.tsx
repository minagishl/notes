import satori from "satori";
import sharp from "sharp";

function Body({ emoji }: { emoji: string }): JSX.Element {
  return (
    <main
      style={{
        height: "100%",
        width: "100%",
        backgroundColor: "#fff",
        padding: "100px",
      }}
    >
      <img
        src={`https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.1.0/72x72/${emoji}.png`}
        alt={emoji}
      />
    </main>
  );
}

export async function getImage(emoji: string) {
  const svg = await satori(<Body emoji={emoji} />, {
    width: 500,
    height: 500,
    fonts: [],
  });

  return await sharp(Buffer.from(svg)).png().toBuffer();
}
