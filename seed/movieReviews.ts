import { MovieReviews } from '../shared/types'
let reviewIdCounter =1;
export const movieReviews: MovieReviews[] = [
  {
    movieId: 1234,
    reviewId:reviewIdCounter++,
    reviewerId: "cinemafanatic@movies.com",
    reviewDate: "2024-03-15", 
    content: "Rebel Moon offers stunning visuals and an intriguing premise, but falls short in character development. The action sequences are impressive, yet the plot feels somewhat derivative."
  },

  {
    movieId: 1234,
    reviewId:reviewIdCounter++,
    reviewerId: "scifilovr@galaxymail.net",
    reviewDate: "2024-03-15",
    content: "A visually spectacular space opera that pays homage to classic sci-fi. While the story might not be groundbreaking, the world-building and action keep you engaged throughout."
  },

  {
    movieId: 2345,
    reviewId:reviewIdCounter++,
    reviewerId: "comicguru@heromail.com",
    reviewDate: "2024-03-18",
    content: "Aquaman and the Lost Kingdom delivers on underwater spectacle and action. Jason Momoa's charisma carries the film, though the plot occasionally feels waterlogged."
  },
  {
    movieId: 2345,
    reviewId:reviewIdCounter++,
    reviewerId: "blockbusterbuff@filmfan.org",
    reviewDate: "2024-04-01",
    content: "While visually impressive, the sequel lacks the freshness of the original. The action is entertaining, but the story struggles to stay afloat amidst the CGI extravaganza."
  },
  {
    movieId: 695721,
    reviewId:reviewIdCounter++,
    reviewerId: "booktofilm@litreviews.com",
    reviewDate: "2024-04-05",
    content: "The Hunger Games prequel successfully captures the essence of the original series while offering a fresh perspective. Strong performances and political intrigue make for a compelling watch."
  },
  {
    movieId: 695721,
    reviewId:reviewIdCounter++,
    reviewerId: "yamovielover@teenmedia.net",
    reviewDate: "2024-04-06",
    content: "A dark and captivating origin story that adds depth to the Hunger Games universe. The cast delivers nuanced performances, especially in portraying the moral ambiguity of the characters."
  },
  {
    movieId: 1029575,
    reviewId:reviewIdCounter++,
    reviewerId: "actioncomedy@laughandthrill.com",
    reviewDate: "2024-05-10",
    content: "The Family Plan offers a fun blend of action and comedy. Mark Wahlberg's charm shines through, making for an entertaining, if somewhat predictable, ride."
  },
  {
    movieId: 1029575,
    reviewId:reviewIdCounter++,
    reviewerId: "casualviewer@easywatch.net",
    reviewDate: "2024-05-14",
    content: "A light-hearted action comedy that doesn't take itself too seriously. Good for a few laughs, but don't expect anything groundbreaking."
  },
  {
    movieId: 787699,
    reviewId:reviewIdCounter++,
    reviewerId: "fantasybuff@magicmovies.org",
    reviewDate: "2024-05-25",
    content: "Wonka is a delightful and whimsical prequel that captures the magic of Roald Dahl's world. Timothée Chalamet brings a fresh energy to the iconic character."
  },
  {
    movieId: 787699,
    reviewId:reviewIdCounter++,
    reviewerId: "nostalgiccinema@retrofilms.com",
    reviewDate: "2024-06-04",
    content: "A charming and imaginative origin story that stands on its own while honoring the beloved source material. The musical numbers and set designs are particularly enchanting."
  },
  {
    movieId: 872585,
    reviewId:reviewIdCounter++,
    reviewerId: "historybuff@periodpieces.net",
    reviewDate: "2024-06-12",
    content: "Oppenheimer is a masterclass in filmmaking. Christopher Nolan's direction and Cillian Murphy's performance create a haunting and profound exploration of one of history's most complex figures."
  },
  {
    movieId: 872585,
    reviewId:reviewIdCounter++,
    reviewerId: "puristcritic@filmarts.org",
    reviewDate: "2024-06-18",
    content: "An epic biographical thriller that doesn't shy away from the moral complexities of its subject. The ensemble cast is superb, and the technical aspects are nothing short of brilliant"
  },
  {
    movieId: 930564,
    reviewId:reviewIdCounter++,
    reviewerId: "indiecinephile@arthouse.com",
    reviewDate: "2024-06-30",
    content: "Saltburn is a wickedly entertaining and provocative social satire. Emerald Fennell's direction keeps you guessing, while the cast delivers deliciously twisted performances."
  },
  {
    movieId: 930564,
    reviewId:reviewIdCounter++,
    reviewerId: "artfilmbuff@cinemaclub.net",
    reviewDate: "2024-07-09",
    content: "A darkly comic and visually stunning exploration of class and obsession. The film's bold choices and unexpected turns make for a truly unforgettable viewing experience."
  },
  {
    movieId: 466420,
    reviewId:reviewIdCounter++,
    reviewerId: "truestoryfan@realitycinema.org",
    reviewDate: "2024-07-16",
    content: "Killers of the Flower Moon is a haunting and masterfully crafted historical drama. Scorsese's direction and the stellar performances bring this tragic chapter of history to vivid life."
  },
  {
    movieId: 466420,
    reviewId:reviewIdCounter++,
    reviewerId: "filmhistory@cinemaarchive.com",
    reviewDate: "2024-07-23",
    content: "An epic and unflinching look at a dark period in American history. The attention to detail, coupled with powerful performances, makes this a must-see film."
  },
  {
    movieId: 1071215,
    reviewId:reviewIdCounter++,
    reviewerId: "horrorfreak@screamscene.net",
    reviewDate: "2024-08-15",
    content: "Thanksgiving serves up a satisfying slice of holiday horror. While it doesn't reinvent the genre, it offers enough thrills and dark humor to keep slasher fans entertained."
  },
  {
    movieId: 1071215,
    reviewId:reviewIdCounter++,
    reviewerId: "seasonalhorror@holidayfright.com",
    reviewDate: "2024-08-22",
    content: "A decent entry in the holiday horror subgenre. The kills are creative, but the plot is somewhat predictable. Still, it's a fun watch for horror enthusiasts."
  },
  {
    movieId: 901362,
    reviewId:reviewIdCounter++,
    reviewerId: "animationfan@cartooncritic.org",
    reviewDate: "2024-09-02",
    content: "Trolls Band Together continues the franchise's tradition of colorful animation and catchy tunes. While it may not break new ground, it's sure to entertain its target audience."
  },
  {
    movieId: 901362,
    reviewId:reviewIdCounter++,
    reviewerId: "familyfilms@kidscorner.net",
    reviewDate: "2024-09-19",
    content: "A vibrant and energetic animated adventure that the whole family can enjoy. The voice cast is excellent, and the positive messages about family and friendship shine through."
  },
   { movieId: 385687,
    reviewId:reviewIdCounter++,
    reviewerId: "actionhero@explosionscene.com",
    reviewDate: "2024-10-06",
    content: "Fast X delivers the over-the-top action and spectacle fans of the franchise have come to expect. While the plot may be convoluted, the stunts and set pieces are as thrilling as ever."
  },
]