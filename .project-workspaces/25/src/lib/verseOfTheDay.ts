/**
 * The Reflection — deterministic DAILY verse rotation, no external API,
 * works offline. The whole congregation sits with the same Word each day.
 *
 * One source of truth for both the landing page hero and the in-app Daily Word.
 *
 * Usage:
 *   import { getVerseOfTheDay } from "@/lib/verseOfTheDay";
 *   const { ref, text } = getVerseOfTheDay(); // today's reflection
 */

export const CURATED_VERSES = [
  { ref: "Genesis 1:1", text: `In the beginning God created the heaven and the earth.` },
  { ref: "Psalm 23:1", text: `The LORD is my shepherd; I shall not want.` },
  {
    ref: "John 3:16",
    text: `For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.`,
  },
  {
    ref: "Isaiah 40:31",
    text: `But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; they shall walk, and not faint.`,
  },
  {
    ref: "Isaiah 41:10",
    text: `Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.`,
  },
  {
    ref: "Isaiah 26:3",
    text: `Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.`,
  },
  {
    ref: "Isaiah 55:11",
    text: `So shall my word be that goeth forth out of my mouth: it shall not return unto me void, but it shall accomplish that which I please, and it shall prosper in the thing whereto I sent it.`,
  },
  {
    ref: "Isaiah 43:2",
    text: `When thou passest through the waters, I will be with thee; and through the rivers, they shall not overflow thee: when thou walkest through the fire, thou shalt not be burned; neither shall the flame kindle upon thee.`,
  },
  {
    ref: "Jeremiah 29:11",
    text: `For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.`,
  },
  {
    ref: "Psalm 27:1",
    text: `The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?`,
  },
  {
    ref: "Psalm 34:18",
    text: `The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.`,
  },
  {
    ref: "Psalm 37:4",
    text: `Delight thyself also in the LORD; and he shall give thee the desires of thine heart.`,
  },
  {
    ref: "Psalm 46:10",
    text: `Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.`,
  },
  {
    ref: "Psalm 91:1",
    text: `He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.`,
  },
  { ref: "Psalm 103:2", text: `Bless the LORD, O my soul, and forget not all his benefits.` },
  { ref: "Psalm 119:105", text: `Thy word is a lamp unto my feet, and a light unto my path.` },
  {
    ref: "Psalm 121:1",
    text: `I will lift up mine eyes unto the hills, from whence cometh my help.`,
  },
  {
    ref: "Psalm 139:14",
    text: `I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.`,
  },
  {
    ref: "Psalm 145:18",
    text: `The LORD is nigh unto all them that call upon him, to all that call upon him in truth.`,
  },
  {
    ref: "Proverbs 3:5",
    text: `Trust in the LORD with all thine heart; and lean not unto thine own understanding.`,
  },
  {
    ref: "Proverbs 18:10",
    text: `The name of the LORD is a strong tower: the righteous runneth into it, and is safe.`,
  },
  {
    ref: "Lamentations 3:22",
    text: `It is of the LORD's mercies that we are not consumed, because his compassions fail not.`,
  },
  {
    ref: "Micah 6:8",
    text: `He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?`,
  },
  {
    ref: "Joshua 1:9",
    text: `Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.`,
  },
  {
    ref: "Matthew 6:33",
    text: `But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.`,
  },
  {
    ref: "Matthew 5:16",
    text: `Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.`,
  },
  {
    ref: "Matthew 28:19",
    text: `Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.`,
  },
  {
    ref: "Matthew 11:28",
    text: `Come unto me, all ye that labour and are heavy laden, and I will give you rest.`,
  },
  {
    ref: "John 10:10",
    text: `The thief cometh not, but for to steal, and to kill, and to destroy: I am come that they might have life, and that they might have it more abundantly.`,
  },
  {
    ref: "John 14:6",
    text: `Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.`,
  },
  {
    ref: "John 15:13",
    text: `Greater love hath no man than this, that a man lay down his life for his friends.`,
  },
  {
    ref: "John 16:33",
    text: `These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.`,
  },
  { ref: "John 8:36", text: `If the Son therefore shall make you free, ye shall be free indeed.` },
  { ref: "Luke 1:37", text: `For with God nothing shall be impossible.` },
  {
    ref: "Romans 8:1",
    text: `There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.`,
  },
  {
    ref: "Romans 5:8",
    text: `But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.`,
  },
  {
    ref: "Romans 8:28",
    text: `And we know that all things work together for good to them that love God, to them who are the called according to his purpose.`,
  },
  {
    ref: "Romans 12:2",
    text: `And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.`,
  },
  {
    ref: "Romans 8:38-39",
    text: `For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God.`,
  },
  {
    ref: "1 Corinthians 13:13",
    text: `And now abideth faith, hope, charity, these three; but the greatest of these is charity.`,
  },
  {
    ref: "Ephesians 2:8",
    text: `For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.`,
  },
  {
    ref: "Ephesians 3:20",
    text: `Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us.`,
  },
  { ref: "Philippians 4:13", text: `I can do all things through Christ which strengtheneth me.` },
  {
    ref: "Philippians 4:6",
    text: `Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.`,
  },
  {
    ref: "Philippians 4:19",
    text: `But my God shall supply all your need according to his riches in glory by Christ Jesus.`,
  },
  {
    ref: "Galatians 6:9",
    text: `And let us not be weary in well doing: for in due season we shall reap, if we faint not.`,
  },
  {
    ref: "2 Timothy 1:7",
    text: `For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.`,
  },
  {
    ref: "Hebrews 11:1",
    text: `Now faith is the substance of things hoped for, the evidence of things not seen.`,
  },
  {
    ref: "Revelation 21:4",
    text: `And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.`,
  },
  {
    ref: "Psalm 51:10",
    text: `Create in me a clean heart, O God; and renew a right spirit within me.`,
  },
  {
    ref: "Numbers 6:24-26",
    text: `The LORD bless thee, and keep thee: the LORD make his face shine upon thee, and be gracious unto thee: the LORD lift up his countenance upon thee, and give thee peace.`,
  },
  {
    ref: "Romans 15:13",
    text: `Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.`,
  },
] as const;

export type DailyVerse = { ref: string; text: string };

/**
 * Returns today's reflection using a deterministic DAILY rotation.
 * Same verse for every user on the same calendar day.
 *
 * @param date - override for testing (defaults to today)
 */
export function getVerseOfTheDay(date: Date = new Date()): DailyVerse {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((current - start) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % CURATED_VERSES.length;
  return CURATED_VERSES[index];
}
