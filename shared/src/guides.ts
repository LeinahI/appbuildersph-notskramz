import { detectCrop } from './crop.js';
import { normalize } from './keyword.js';
import type { ReplyLanguage } from './language.js';

/**
 * How-to guides for growing palay, for the questions that are not a pest or disease: planting, seed, water,
 * fertilizer timing, weeds, harvest, drying, storage, and rats. The model answers such a question from one guide,
 * the same way it explains a matched problem from its note, so it never guesses farm advice.
 *
 * Sources: PhilRice PalayCheck and Rice Production Manual, IRRI Rice Knowledge Bank. The steps give timing and
 * method, never a pesticide name or a dose, and never a fertilizer amount: amounts depend on the soil, so the
 * steps send the farmer to a soil test, the leaf color chart, or the agriculturist for them.
 */
export interface CareGuide {
  /** Stable slug. */
  id: string;
  /** What the guide covers, in English, for the model. */
  topic: string;
  /** Short Tagalog title, for the reply shown when no model answers. */
  titleTl: string;
  /** Short Cebuano (Bisaya) title. */
  titleCeb: string;
  /** Normalized words and phrases a farmer uses for this topic. Matched as whole words or phrases. */
  keywords: string[];
  /** The steps, in English, for the model. */
  steps: string[];
  /** The same steps in Tagalog, shown when no model answers. */
  stepsTl: string[];
  /** The same steps in Cebuano (Bisaya). */
  stepsCeb: string[];
}

export const RICE_GUIDES: readonly CareGuide[] = [
  {
    id: 'planting-overview',
    topic: 'How to grow rice, from seed to harvest',
    titleCeb: 'Mga lakang sa pagtanom og humay',
    titleTl: 'Mga hakbang sa pagtatanim ng palay',
    keywords: [
      'paano magtanim', 'paano po magtanim', 'paano ang pagtatanim', 'pagtatanim ng palay', 'magtanim ng palay', 'magtanim ng humay',
      'paano magpalay', 'paano mag palay', 'mga hakbang sa pagtatanim', 'proseso ng pagtatanim', 'paano magpatubo ng palay',
      'how to plant rice', 'how to grow rice', 'how do i plant rice', 'how do i grow rice', 'steps in planting rice', 'plant rice', 'grow rice',
      'unsaon pagtanom', 'pagtanom og humay', 'pagtanom sa humay', 'unsaon pagtanom og humay', 'when should i plant rice', 'unsaon pag tanom', 'unsaon pagtanom ug humay', 'pagtanom ug humay', 'unsaon pagtanom sa humay', 'mga lakang sa pagtanom', 'unsaon pagpananom',
    ],
    steps: [
      'Choose certified seed of a variety recommended for your area and season; the MAO or PhilRice can tell you which',
      'Prepare the land: fix the dikes, plow, harrow, and level the field so there are no high and low spots',
      'Raise seedlings in a seedbed, or sow pre-germinated seed directly on a well-leveled field',
      'Transplant young, healthy seedlings at the same time as your neighbors, so pests do not move from field to field',
      'Keep shallow water at first; you may let the field dry a little between irrigations later, but keep water in during flowering',
      'Apply fertilizer at planting, at early tillering, and when the young grain head starts to form, based on a soil test or a leaf color chart',
      'Control weeds in the first month, and walk the field every week to check for pests and diseases',
      'Harvest when most of the grains (80 to 85 percent) are golden or straw-colored, then thresh and dry the grain right away',
    ],
    stepsTl: [
      'Pumili ng certified na binhi ng barayting angkop sa inyong lugar at panahon; maitatanong ito sa MAO o PhilRice',
      'Ihanda ang lupa: ayusin ang pilapil, araruhin, suyurin, at patagin ang palayan para walang mataas at mababang bahagi',
      'Magpunla sa punlaan, o magsabog ng binhing may supang sa maayos na napatag na palayan',
      'Maglipat-tanim ng bata at malusog na punla nang sabay sa mga kapitbahay, para hindi lumipat-lipat ang peste',
      'Panatilihing mababaw ang tubig sa simula; maaaring patuyuin nang kaunti sa pagitan ng patubig, pero dapat may tubig sa pamumulaklak',
      'Mag-abono sa pagtatanim, sa maagang pagsusuwi, at kapag nagsisimulang mabuo ang uhay, batay sa soil test o leaf color chart',
      'Kontrolin ang damo sa unang buwan, at suriin ang palayan bawat linggo para sa peste at sakit',
      'Umani kapag karamihan ng butil (80 hanggang 85 porsiyento) ay ginintuan o kulay-dayami, saka giikin at patuyuin agad',
    ],
    stepsCeb: [
      'Pagpili og certified nga liso sa barayti nga angay sa inyong lugar ug panahon; makapangutana mo sa MAO o PhilRice',
      'Andama ang yuta: ayoha ang pilapil, daruha, karasa, ug patag-a ang basakan aron walay taas ug ubos nga bahin',
      'Pagsemilya sa semilyahan, o isabwag ang liso nga naay turok sa maayong pagkapatag nga basakan',
      'Ibalhin-tanom ang batan-on ug himsog nga semilya dungan sa mga silingan, aron dili mobalhin-balhin ang peste',
      'Ipabilin nga mabaw ang tubig sa sinugdanan; mahimong pauga-on gamay tali sa pagpatubig, apan kinahanglan adunay tubig inig pamulak',
      'Pag-abono inig tanom, sa sayo nga pagsuwi, ug inig sugod pagporma sa uhay, sumala sa soil test o leaf color chart',
      'Kontrola ang sagbot sa unang bulan, ug susiha ang basakan matag semana alang sa peste ug sakit',
      'Pag-ani kung kadaghanan sa lugas (80 ngadto 85 porsiyento) bulawanon na o kolor-dagami, unya linasa ug pauga-a dayon',
    ],
  },
  {
    id: 'seed',
    topic: 'Choosing good seed and a rice variety',
    titleCeb: 'Pagpili sa liso ug barayti',
    titleTl: 'Pagpili ng binhi at barayti',
    keywords: [
      'binhi', 'magandang binhi', 'anong binhi', 'klase ng binhi', 'klaseng binhi', 'barayti', 'variety', 'varieties', 'seed', 'seeds',
      'certified seed', 'inbred', 'hybrid', 'liso', 'binhing', 'buto na itatanim', 'pinakamagandang binhi', 'unsang barayti', 'unsa nga barayti', 'maayo nga liso', 'liso sa humay', 'unsang liso',
    ],
    steps: [
      'Use certified seed (with a seed tag) or clean seed from a trusted source, not grain saved from a field that had pests or diseases',
      'Ask the MAO, PhilRice, or the DA which varieties suit your field: irrigated or rainfed, wet or dry season, and the pests common in your area',
      'Before soaking, put the seed in clean water and remove the seeds that float, because they are empty or weak',
      'Prepare only the seed you need, and store the rest in a dry, cool place in a sealed container',
      'If one pest or disease keeps coming back, change to a variety that resists it',
    ],
    stepsTl: [
      'Gumamit ng certified na binhi (may seed tag) o malinis na binhi mula sa mapagkakatiwalaang pinagmulan, hindi ani mula sa palayang may peste o sakit',
      'Itanong sa MAO, PhilRice, o DA kung aling barayti ang bagay sa inyong palayan: may patubig o sahod-ulan, tag-ulan o tag-araw, at ang karaniwang peste sa lugar',
      'Bago ibabad, ilagay ang binhi sa malinis na tubig at alisin ang mga lumulutang, dahil hungkag o mahina ang mga iyon',
      'Ihanda lang ang binhing kailangan, at itago ang natira sa tuyo at malamig na lugar na nakasara',
      'Kung paulit-ulit ang isang peste o sakit, lumipat sa barayting matibay laban dito',
    ],
    stepsCeb: [
      'Gamit og certified nga liso (naay seed tag) o limpyo nga liso gikan sa kasaligan nga tinubdan, dili ani gikan sa basakan nga adunay peste o sakit',
      'Pangutana sa MAO, PhilRice, o DA kung unsang barayti ang angay sa inyong basakan: patubigan o sahod-ulan, ting-ulan o ting-init, ug ang kasagarang peste sa lugar',
      'Sa dili pa ihumol, ibutang ang liso sa limpyo nga tubig ug kuhaa ang mga molutaw, kay walay sulod o luya kini',
      'Andama lang ang liso nga gikinahanglan, ug tipigi ang nahibilin sa uga ug bugnaw nga lugar nga sirado',
      'Kung balik-balik ang usa ka peste o sakit, pag-ilis og barayti nga lig-on batok niini',
    ],
  },
  {
    id: 'seedbed',
    topic: 'Soaking seed and making a seedbed',
    titleCeb: 'Paghumol sa liso ug pagsemilya',
    titleTl: 'Pagbababad ng binhi at pagpupunla',
    keywords: [
      'magpunla', 'pagpupunla', 'punlaan', 'seedbed', 'seed bed', 'ibabad ang binhi', 'pagbababad', 'pagbabad ng binhi', 'babad',
      'patubuin ang binhi', 'pasibulin', 'dapog', 'bago ilipat', 'ilang araw bago', 'ilang araw ang punla', 'ilang linggo ang punla', 'edad ng punla', 'how old should seedlings be', 'semilyahan', 'magsemilya', 'pagsemilya', 'how to make a seedbed', 'soak the seed', 'soaking seed', 'humol', 'ihumol', 'paghumol', 'pagpaturok', 'paturok',
    ],
    steps: [
      'Soak the good seed in clean water for about a day, then drain it and keep it covered in a shaded place for one to one and a half days until small sprouts show',
      'Make a wet seedbed in a well-puddled corner of the field: a raised, level bed about one meter wide, with small canals around it for water',
      'Sow the sprouted seed evenly and not too thick, so each seedling has room to grow strong',
      'Keep the bed moist by letting water into the canals, and keep a shallow layer of water as the seedlings grow',
      'Protect the bed from birds, rats, and snails',
      'Transplant wet-bed seedlings when they are about two to three weeks old; dapog seedlings are ready much younger, at 9 to 14 days',
    ],
    stepsTl: [
      'Ibabad ang magandang binhi sa malinis na tubig nang mga isang araw, saka patuluin at takpan sa malilim na lugar nang isa hanggang isa\'t kalahating araw hanggang lumabas ang maliliit na supang',
      'Gumawa ng basang punlaan sa maayos na naputik na sulok ng palayan: nakaangat at patag na kama na mga isang metro ang lapad, may maliliit na kanal sa paligid para sa tubig',
      'Isabog nang pantay at hindi masyadong makapal ang binhing may supang, para may lugar ang bawat punla na lumaki nang malakas',
      'Panatilihing basa ang punlaan sa pagpapapasok ng tubig sa mga kanal, at panatilihin ang mababaw na tubig habang lumalaki ang punla',
      'Bantayan ang punlaan laban sa ibon, daga, at kuhol',
      'Ilipat-tanim ang punla mula sa basang punlaan kapag mga dalawa hanggang tatlong linggo na; ang dapog ay handa nang mas bata, sa 9 hanggang 14 na araw',
    ],
    stepsCeb: [
      'Ihumol ang maayong liso sa limpyo nga tubig mga usa ka adlaw, unya hubsi ug tabuni sa landong nga lugar sulod sa usa ngadto sa usa ug tunga ka adlaw hangtod motungha ang gagmay nga turok',
      'Paghimo og basa nga semilyahan sa maayong pagkalapok nga suok sa basakan: taas ug patag nga higdaanan nga mga usa ka metro ang gilapdon, adunay gagmay nga kanal palibot para sa tubig',
      'Isabwag nga parehas ug dili kaayo baga ang liso nga naay turok, aron ang matag semilya adunay luna nga motubo nga kusgan',
      'Ipabilin nga basa ang semilyahan pinaagi sa pagpasulod og tubig sa mga kanal, ug ipabilin ang mabaw nga tubig samtang nagdako ang semilya',
      'Panalipdi ang semilyahan gikan sa langgam, ilaga, ug kuhol',
      'Ibalhin-tanom ang semilya gikan sa basa nga semilyahan kung mga duha ngadto sa tulo ka semana na; ang dapog andam na sa mas bata, sa 9 ngadto sa 14 ka adlaw',
    ],
  },
  {
    id: 'land-prep',
    topic: 'Preparing the field before planting',
    titleCeb: 'Pag-andam sa yuta',
    titleTl: 'Paghahanda ng lupa',
    keywords: [
      'paghahanda ng lupa', 'ihanda ang lupa', 'ihahanda ang lupa', 'maghanda ng lupa', 'araro', 'mag araro', 'araruhin', 'pag aararo', 'suyod',
      'magsuyod', 'pagsusuyod', 'patagin', 'pagpapatag', 'land preparation', 'prepare the land', 'prepare the field', 'plowing', 'harrowing', 'leveling',
      'pagdaro', 'daro', 'pag andam sa yuta', 'karas', 'pagkaras', 'karasa', 'daruha', 'pagpatag', 'andam sa basakan', 'pag andam sa basakan',
    ],
    steps: [
      'Repair the dikes and close holes so the field holds water, and clean weeds from the dikes and canals',
      'Flood the field to soften the soil and let the stubble and weeds rot, then plow',
      'Harrow two or more times, about a week apart, so weeds that sprout are killed and the soil becomes fine mud',
      'Level the field well so the water is the same depth everywhere; this helps against weeds and golden apple snails',
      'Make small canals so you can drain water when needed, and finish preparing the land just before planting',
    ],
    stepsTl: [
      'Ayusin ang pilapil at takpan ang mga butas para hindi tumagas ang tubig, at linisin ang damo sa pilapil at kanal',
      'Patubigan ang palayan para lumambot ang lupa at mabulok ang pinagputulan at damo, saka araruhin',
      'Suyurin nang dalawa o higit pang beses, mga isang linggo ang pagitan, para mamatay ang tumutubong damo at maging pino ang putik',
      'Patagin nang maayos ang palayan para pantay ang lalim ng tubig; nakakatulong ito laban sa damo at kuhol',
      'Gumawa ng maliliit na kanal para mapatuyo kung kailangan, at tapusin ang paghahanda bago mismo magtanim',
    ],
    stepsCeb: [
      'Ayoha ang pilapil ug tabuni ang mga lungag aron dili motulo ang tubig, ug limpyohi ang sagbot sa pilapil ug kanal',
      'Patubigi ang basakan aron mohumok ang yuta ug madunot ang dagami ug sagbot, unya daruha',
      'Karasa kaduha o labaw pa, mga usa ka semana ang gilay-on, aron mamatay ang motubo nga sagbot ug mahimong pino ang lapok',
      'Patag-a og maayo ang basakan aron parehas ang giladmon sa tubig; makatabang kini batok sa sagbot ug kuhol',
      'Paghimo og gagmay nga kanal aron mahubsan kung kinahanglan, ug humana ang pag-andam sa dili pa gyud motanom',
    ],
  },
  {
    id: 'transplanting',
    topic: 'Transplanting and direct seeding',
    titleCeb: 'Pagbalhin-tanom ug pagsabwag',
    titleTl: 'Paglilipat-tanim at pagsasabog',
    keywords: [
      'maglipat tanim', 'paglilipat tanim', 'lipat tanim', 'ilipat ang punla', 'transplant', 'transplanting', 'direct seeding', 'direct seed',
      'sabog tanim', 'pagsasabog', 'magsabog', 'pagitan ng tanim', 'distansya ng tanim', 'spacing', 'ilang punla', 'pagbalhin tanom', 'magtransplant', 'balhin tanom', 'magbalhin tanom', 'pagbalhin', 'sabwag', 'pagsabwag', 'gilay on sa tanom',
    ],
    steps: [
      'Transplant at the same time as the neighboring farms, so pests and rats do not move from field to field',
      'Use young, healthy seedlings, about two to three weeks old from a wet bed',
      'Plant two to three seedlings per hill, in straight rows about 20 by 20 centimeters apart, or the spacing the MAO advises for your variety',
      'Plant shallow, only two to three centimeters deep, so the seedlings recover fast',
      'Keep a shallow layer of water for the first days, and replant missing hills within a week',
      'For direct seeding, sow pre-germinated seed evenly on a well-leveled field with no standing water, then let water in slowly as the seedlings grow',
    ],
    stepsTl: [
      'Maglipat-tanim nang sabay sa mga katabing palayan, para hindi lumipat-lipat ang peste at daga',
      'Gumamit ng bata at malusog na punla, mga dalawa hanggang tatlong linggo mula sa basang punlaan',
      'Magtanim ng dalawa hanggang tatlong punla bawat butas, sa tuwid na hanay na mga 20 por 20 sentimetro ang pagitan, o ayon sa payo ng MAO para sa inyong barayti',
      'Itanim nang mababaw, dalawa hanggang tatlong sentimetro lang, para mabilis makabawi ang punla',
      'Panatilihin ang mababaw na tubig sa mga unang araw, at palitan ang mga nawalang tanim sa loob ng isang linggo',
      'Sa pagsasabog, isabog nang pantay ang binhing may supang sa patag na palayang walang nakatigil na tubig, saka dahan-dahang patubigan habang lumalaki ang punla',
    ],
    stepsCeb: [
      'Pagbalhin-tanom dungan sa mga silingang basakan, aron dili mobalhin-balhin ang peste ug ilaga',
      'Gamit og batan-on ug himsog nga semilya, mga duha ngadto sa tulo ka semana gikan sa basa nga semilyahan',
      'Itanom ang duha ngadto sa tulo ka semilya matag lungag, sa tul-id nga laray nga mga 20 por 20 sentimetro ang gilay-on, o sumala sa tambag sa MAO para sa inyong barayti',
      'Itanom nga mabaw, duha ngadto sa tulo ka sentimetro lang, aron dali makabawi ang semilya',
      'Ipabilin ang mabaw nga tubig sa unang mga adlaw, ug ilisi ang nawala nga tanom sulod sa usa ka semana',
      'Sa pagsabwag, isabwag nga parehas ang liso nga naay turok sa patag nga basakan nga walay nagtipon nga tubig, unya hinay-hinay nga patubigi samtang nagdako ang semilya',
    ],
  },
  {
    id: 'water',
    topic: 'Water management in the rice field',
    titleCeb: 'Pagdumala sa tubig sa basakan',
    titleTl: 'Pamamahala ng tubig sa palayan',
    keywords: [
      'patubig', 'tubig sa palayan', 'magdilig', 'pagdidilig', 'diligan', 'irrigation', 'irrigate', 'awd', 'alternate wetting', 'alternate wetting and drying',
      'gaano kataas ang tubig', 'gaano kalalim ang tubig', 'taas ng tubig', 'lalim ng tubig', 'patuyuin ang palayan', 'magpatuyo ng palayan',
      'water management', 'how much water', 'kulang sa tubig', 'tubig sa humay', 'pagpatubig', 'tubig sa basakan', 'pagpauga sa basakan', 'pila ka taas ang tubig', 'giladmon sa tubig',
    ],
    steps: [
      'Keep shallow water, about two to five centimeters, from transplanting until the plants are established; it also keeps weeds down',
      'To save water you can use alternate wetting and drying: set a perforated tube in the field, let the water drop to about 15 centimeters below the soil surface, then irrigate again',
      'Start drying cycles only one to two weeks after transplanting, once the weeds are under control',
      'Keep water in the field from about a week before to a week after flowering, when the plant needs water most',
      'Drain the field about one to two weeks before harvest, so the soil is firm and the grain ripens evenly',
      'Where there are golden apple snails, keep the water very shallow in the first weeks after transplanting',
    ],
    stepsTl: [
      'Panatilihin ang mababaw na tubig, mga dalawa hanggang limang sentimetro, mula paglilipat-tanim hanggang tumibay ang mga tanim; pinipigilan din nito ang damo',
      'Para makatipid sa tubig, maaaring gamitin ang alternate wetting and drying: maglagay ng tubong may butas sa palayan, hayaang bumaba ang tubig sa mga 15 sentimetro sa ilalim ng lupa, saka muling patubigan',
      'Simulan ang pagpapatuyo isa hanggang dalawang linggo lang pagkatapos maglipat-tanim, kapag kontrolado na ang damo',
      'Dapat may tubig ang palayan mula mga isang linggo bago hanggang isang linggo pagkatapos ng pamumulaklak, dahil dito pinakakailangan ng tanim ang tubig',
      'Patuyuin ang palayan mga isa hanggang dalawang linggo bago umani, para matigas ang lupa at pantay ang pagkahinog ng butil',
      'Kung may kuhol, panatilihing napakababaw ng tubig sa mga unang linggo pagkatapos maglipat-tanim',
    ],
    stepsCeb: [
      'Ipabilin ang mabaw nga tubig, mga duha ngadto sa lima ka sentimetro, gikan sa pagbalhin-tanom hangtod molig-on ang tanom; makapugong usab kini sa sagbot',
      'Aron makadaginot sa tubig, mahimong gamiton ang alternate wetting and drying: magbutang og tubo nga adunay mga lungag sa basakan, pasagdi nga mous-os ang tubig mga 15 sentimetro ubos sa yuta, unya patubigi pag-usab',
      'Sugdi ang pagpauga usa ngadto sa duha ka semana human sa pagbalhin-tanom, kung kontrolado na ang sagbot',
      'Kinahanglan adunay tubig ang basakan gikan sa mga usa ka semana sa wala pa hangtod usa ka semana human sa pamulak, kay dinhi labing kinahanglan sa tanom ang tubig',
      'Hubsi ang basakan mga usa ngadto sa duha ka semana sa dili pa mag-ani, aron gahi ang yuta ug parehas ang paghinog sa lugas',
      'Kung adunay kuhol, ipabilin nga mabaw kaayo ang tubig sa unang mga semana human sa pagbalhin-tanom',
    ],
  },
  {
    id: 'fertilizer',
    topic: 'When and how to apply fertilizer to rice',
    titleCeb: 'Pag-abono sa humay',
    titleTl: 'Pag-aabono ng palay',
    keywords: [
      'abono', 'mag abono', 'pag aabono', 'abonohan', 'abuno', 'pataba', 'fertilizer', 'fertilizers', 'fertilize', 'urea', 'complete fertilizer',
      'leaf color chart', 'lcc', 'soil test', 'kailan mag abono', 'sustansya', 'nutrient', 'nutrients', 'organic fertilizer', 'organikong pataba', 'compost', 'pag abono', 'abonohan sa humay',
    ],
    steps: [
      'The right amount depends on your soil and season: have the soil tested, use the soil test kit or the minus-one element technique at the MAO, or ask for a Rice Crop Manager recommendation',
      'Apply the first fertilizer at planting or at the last harrowing, as recommended for your field',
      'Add nitrogen at early tillering, about two to three weeks after transplanting, and again when the young grain head starts to form inside the stem (panicle initiation), about two months before harvest',
      'Use a leaf color chart: if the leaves are lighter than the chart says they should be, the plants need more nitrogen',
      'Do not overdo nitrogen; too much invites planthoppers and blast and makes the plants fall over',
      'Apply fertilizer on moist soil or shallow water and do not drain right after; plow in rice straw or compost instead of burning it',
    ],
    stepsTl: [
      'Nakadepende sa lupa at panahon ang tamang dami: ipasuri ang lupa, gamitin ang soil test kit o minus-one element technique sa MAO, o humingi ng rekomendasyon mula sa Rice Crop Manager',
      'Ilagay ang unang abono sa pagtatanim o sa huling pagsusuyod, ayon sa rekomendasyon para sa inyong palayan',
      'Magdagdag ng nitrogen sa maagang pagsusuwi, mga dalawa hanggang tatlong linggo pagkatapos maglipat-tanim, at muli kapag nagsisimulang mabuo ang uhay sa loob ng tangkay (panicle initiation), mga dalawang buwan bago ang ani',
      'Gumamit ng leaf color chart: kung mas maputla ang dahon kaysa sa nararapat sa chart, kailangan pa ng nitrogen ang palay',
      'Huwag sobrahan ang nitrogen; inaakit nito ang planthopper at blast at nagpapadapa sa palay',
      'Mag-abono sa basang lupa o mababaw na tubig at huwag agad patuyuin; ibaon ang dayami o compost sa halip na sunugin',
    ],
    stepsCeb: [
      'Nagdepende sa yuta ug panahon ang sakto nga gidaghanon: ipasusi ang yuta, gamita ang soil test kit o minus-one element technique sa MAO, o pangayo og rekomendasyon gikan sa Rice Crop Manager',
      'Ibutang ang unang abono inig tanom o sa katapusang pagkaras, sumala sa rekomendasyon para sa inyong basakan',
      'Dugangi og nitrogen sa sayo nga pagsuwi, mga duha ngadto sa tulo ka semana human sa pagbalhin-tanom, ug usab inig sugod pagporma sa uhay sulod sa punoan (panicle initiation), mga duha ka bulan sa dili pa ang ani',
      'Gamita ang leaf color chart: kung mas luspad ang dahon kaysa sa angay sa chart, nanginahanglan pa og nitrogen ang humay',
      'Ayaw sobrahi ang nitrogen; makadani kini og planthopper ug blast ug makapahapay sa humay',
      'Pag-abono sa basa nga yuta o mabaw nga tubig ug ayaw dayon hubsi; ilubong ang dagami o compost imbes sunogon',
    ],
  },
  {
    id: 'weeds',
    topic: 'Controlling weeds in rice',
    titleCeb: 'Pagkontrol sa sagbot',
    titleTl: 'Pagkontrol ng damo',
    keywords: [
      'damo', 'mga damo', 'sagbot', 'weed', 'weeds', 'magbunot ng damo', 'pagbunot ng damo', 'magdamo', 'pagdamo', 'weeding', 'rotary weeder',
      'maraming damo', 'madamo', 'paghawan', 'paghawan sa sagbot', 'pagbunlot sa sagbot', 'daghang sagbot', 'ibton ang sagbot',
    ],
    steps: [
      'Prepare and level the land well; weeds grow on the high spots that water does not cover',
      'Keep a shallow layer of water after transplanting; standing water stops many weeds from sprouting',
      'Pull weeds by hand or use a rotary weeder in the first 30 to 40 days, when weeds hurt rice the most',
      'Clean the dikes and canals so weed seeds do not spread into the field',
      'Use clean seed that has no weed seeds mixed in',
      'If you are thinking of a herbicide, ask the local agriculturist which one is safe and how to use it',
    ],
    stepsTl: [
      'Ihanda at patagin nang maayos ang lupa; tumutubo ang damo sa matataas na bahaging hindi naaabot ng tubig',
      'Panatilihin ang mababaw na tubig pagkatapos maglipat-tanim; pinipigilan ng nakatigil na tubig ang pagtubo ng maraming damo',
      'Bunutin ang damo o gumamit ng rotary weeder sa unang 30 hanggang 40 araw, kung kailan pinakanakakasira ang damo',
      'Linisin ang pilapil at kanal para hindi kumalat ang buto ng damo sa palayan',
      'Gumamit ng malinis na binhing walang halong buto ng damo',
      'Kung balak gumamit ng herbicide, itanong muna sa lokal na agriculturist kung alin ang ligtas at paano ito gamitin',
    ],
    stepsCeb: [
      'Andama ug patag-a og maayo ang yuta; motubo ang sagbot sa taas nga bahin nga dili maabot sa tubig',
      'Ipabilin ang mabaw nga tubig human sa pagbalhin-tanom; ang nagtipon nga tubig makapugong sa pagtubo sa daghang sagbot',
      'Ibton ang sagbot o gamita ang rotary weeder sa unang 30 ngadto sa 40 ka adlaw, kanus-a labing makadaot ang sagbot',
      'Limpyohi ang pilapil ug kanal aron dili mokaylap ang liso sa sagbot ngadto sa basakan',
      'Gamit og limpyo nga liso nga walay sagol nga liso sa sagbot',
      'Kung naghunahuna kamo og herbicide, pangutana una sa lokal nga agriculturist kung unsa ang luwas ug unsaon paggamit niini',
    ],
  },
  {
    id: 'harvest',
    topic: 'When and how to harvest rice',
    titleCeb: 'Pag-ani sa humay',
    titleTl: 'Pag-aani ng palay',
    keywords: [
      'mag ani', 'mag aani', 'pag aani', 'anihin', 'aanihin', 'anihan', 'kailan aani', 'kailan mag ani', 'harvest', 'harvesting', 'gapas', 'maggapas',
      'paggapas', 'giik', 'paggiik', 'giikin', 'thresh', 'threshing', 'pag ani', 'pag ani sa humay', 'pwede na bang anihin', 'anihon', 'kanus a anihon', 'giok', 'paggiok', 'linas', 'paglinas',
    ],
    steps: [
      'Harvest when 80 to 85 percent of the grains are golden or straw-colored and the grains at the base of the grain head are firm, usually about a month after flowering',
      'Drain the field one to two weeks before harvest',
      'Do not harvest too early (more empty and chalky grains) or too late (grains fall off and break during milling)',
      'Thresh soon after cutting, within a day if you can; cut palay left piled up heats and the grain turns yellow',
      'Thresh on a clean canvas or floor so the grain is not mixed with soil and stones',
    ],
    stepsTl: [
      'Umani kapag 80 hanggang 85 porsiyento ng butil ay ginintuan o kulay-dayami at matigas na ang mga butil sa puno ng uhay, karaniwang mga isang buwan pagkatapos mamulaklak',
      'Patuyuin ang palayan isa hanggang dalawang linggo bago umani',
      'Huwag umani nang masyadong maaga (mas maraming hungkag at malabsang butil) o masyadong huli (nalalaglag ang butil at nababasag sa paggiling)',
      'Giikin agad pagkatapos gapasin, sa loob ng isang araw kung kaya; ang nakatambak na ginapas ay umiinit at nanilaw ang butil',
      'Maggiik sa malinis na trapal o sahig para hindi mahaluan ng lupa at bato ang butil',
    ],
    stepsCeb: [
      'Pag-ani kung 80 ngadto 85 porsiyento sa lugas bulawanon na o kolor-dagami ug gahi na ang mga lugas sa punoan sa uhay, kasagaran mga usa ka bulan human sa pamulak',
      'Hubsi ang basakan usa ngadto sa duha ka semana sa dili pa mag-ani',
      'Ayaw pag-ani nga sayo kaayo (daghang walay sulod ug malata nga lugas) o ulahi kaayo (mangahulog ang lugas ug mabuak inig galing)',
      'Linasa dayon human sa pag-ani, sulod sa usa ka adlaw kung mahimo; ang natapok nga giani moinit ug madalag ang lugas',
      'Paglinas sa limpyo nga trapal o salog aron dili masagolan og yuta ug bato ang lugas',
    ],
  },
  {
    id: 'drying-storage',
    topic: 'Drying and storing rice grain',
    titleCeb: 'Pagpauga ug pagtipig sa humay',
    titleTl: 'Pagpapatuyo at pag-iimbak ng palay',
    keywords: [
      'magbilad', 'pagbibilad', 'pagbilad', 'ibilad', 'bilad', 'pagpapatuyo ng palay', 'patuyuin ang palay', 'imbak', 'mag imbak', 'pag iimbak', 'iimbak',
      'itago ang palay', 'storage', 'store rice', 'store the grain', 'drying', 'dry the grain', 'moisture', 'bodega', 'pagpauga', 'pagtipig', 'bulad', 'ibulad', 'pagbulad', 'itipig', 'tipigan', 'pagpauga sa humay',
    ],
    steps: [
      'Dry the grain right after threshing, within a day, until it is dry enough to store (about 14 percent moisture: the grain is hard and snaps clean when bitten)',
      'Spread it thin on a clean pavement, net, or mat, or use a mechanical dryer, and turn it often',
      'Never dry palay on highways or roads; it is dangerous and the grain gets dirty',
      'Do not leave it too long in the hottest midday sun, which cracks the grain, and cover it when it rains',
      'Store in clean sacks on wooden pallets, away from walls and the floor, in a dry, airy, rat-proof place',
      'Keep seed for planting apart from grain for eating, and keep it dry',
    ],
    stepsTl: [
      'Patuyuin agad ang butil pagkatapos giikin, sa loob ng isang araw, hanggang sapat ang tuyo para iimbak (mga 14 porsiyentong moisture: matigas ang butil at malinis ang pagkabali kapag kinagat)',
      'Ikalat nang manipis sa malinis na semento, lambat, o banig, o gumamit ng mechanical dryer, at baligtarin nang madalas',
      'Huwag magbilad ng palay sa highway o kalsada; mapanganib ito at dumudumi ang butil',
      'Huwag iwanan nang matagal sa pinakamainit na araw sa tanghali dahil nababasag ang butil, at takpan kapag umulan',
      'Iimbak sa malinis na sako na nakapatong sa paleta, malayo sa dingding at sahig, sa tuyo, mahangin, at ligtas sa dagang lugar',
      'Ihiwalay ang binhing itatanim sa palay na kakainin, at panatilihin itong tuyo',
    ],
    stepsCeb: [
      'Pauga-a dayon ang lugas human sa paglinas, sulod sa usa ka adlaw, hangtod uga na igo nga itipig (mga 14 porsiyento nga moisture: gahi ang lugas ug limpyo ang pagkabali kung kagaton)',
      'Ikatag nga nipis sa limpyo nga semento, pukot, o banig, o gamit og mechanical dryer, ug balihon kanunay',
      'Ayaw pagbulad og humay sa highway o karsada; delikado kini ug mahugawan ang lugas',
      'Ayaw ibilin og dugay sa labing init nga adlaw sa udto kay mabuak ang lugas, ug tabuni inig ulan',
      'Itipig sa limpyo nga sako nga gipatong sa paleta, layo sa bongbong ug salog, sa uga, hanginon, ug luwas sa ilaga nga lugar',
      'Ilain ang liso nga itanom gikan sa humay nga kan-on, ug ipabilin kini nga uga',
    ],
  },
  {
    id: 'rats',
    topic: 'Controlling rats in the rice field',
    titleCeb: 'Pagkontrol sa ilaga sa basakan',
    titleTl: 'Pagkontrol ng daga sa palayan',
    keywords: ['daga', 'mga daga', 'ilaga', 'rat', 'rats', 'rodent', 'rodents', 'kinain ng daga', 'sinira ng daga', 'gikaon sa ilaga', 'daghang ilaga'],
    steps: [
      'Work with your neighbors: rats are controlled best when the whole area acts at the same time',
      'Plant at the same time as the nearby farms, so rats do not have food for long',
      'Keep dikes low and narrow, and clear weeds and tall grass where rats hide and nest',
      'Dig out burrows and set traps, especially before planting and in the early weeks of the crop',
      'Ask the MAO about a trap barrier system or a community rat campaign',
      'Before using any rat poison, ask the local agriculturist, and keep it away from children, animals, and food',
    ],
    stepsTl: [
      'Makipagtulungan sa mga kapitbahay: pinakamabisa ang pagkontrol ng daga kapag sabay-sabay kumilos ang buong lugar',
      'Magtanim nang sabay sa mga katabing palayan, para hindi matagal may pagkain ang daga',
      'Panatilihing mababa at makitid ang pilapil, at linisin ang damo at matataas na talahib na pinagtataguan at pinamumugaran ng daga',
      'Hukayin ang mga lungga at maglagay ng bitag, lalo na bago magtanim at sa mga unang linggo ng tanim',
      'Itanong sa MAO ang trap barrier system o ang sabayang kampanya laban sa daga',
      'Bago gumamit ng anumang lason sa daga, magtanong sa lokal na agriculturist, at ilayo ito sa bata, hayop, at pagkain',
    ],
    stepsCeb: [
      'Pakigtambayayong sa mga silingan: labing epektibo ang pagkontrol sa ilaga kung dungan nga molihok ang tibuok lugar',
      'Pagtanom dungan sa mga silingang basakan, aron dili dugay adunay pagkaon ang ilaga',
      'Ipabilin nga ubos ug pig-ot ang pilapil, ug limpyohi ang sagbot ug taas nga balili nga tagoanan ug salag sa ilaga',
      'Kalota ang mga lungag ug magbutang og lit-ag, ilabina sa dili pa motanom ug sa unang mga semana sa tanom',
      'Pangutana sa MAO bahin sa trap barrier system o dungan nga kampanya batok sa ilaga',
      'Sa dili pa mogamit og bisan unsang hilo o lason sa ilaga, pangutana sa lokal nga agriculturist, ug ilayo kini sa bata, hayop, ug pagkaon',
    ],
  },
  {
    id: 'scouting',
    topic: 'Checking the field when something looks wrong',
    titleCeb: 'Pagsusi sa basakan',
    titleTl: 'Pagsusuri ng palayan',
    keywords: [
      'paano suriin', 'pagsusuri ng palayan', 'suriin ang palayan', 'scouting', 'inspect the field', 'check the field', 'monitor the field',
      'paano malalaman', 'paano ko malalaman', 'unsaon pagsusi', 'pagsusi sa basakan', 'susiha ang basakan',
    ],
    steps: [
      'Walk across the field in a zigzag, not only along the edge',
      'Check 10 to 20 hills in different spots: the leaves, the stem and base, the water line, and the grain heads',
      'Look for insects, eggs, holes, spots, color changes, empty grains, or a bad smell',
      'Note how much of the field is hit: a few hills, a patch, or the whole field',
      'Take a clear photo of the affected part and send it here, or describe what you see',
      'If it spreads fast or many plants are dying, call the local agriculturist right away',
    ],
    stepsTl: [
      'Maglakad sa palayan nang pa-zigzag, hindi lang sa gilid',
      'Suriin ang 10 hanggang 20 puno sa iba\'t ibang bahagi: ang dahon, ang tangkay at puno, ang bandang tubig, at ang uhay',
      'Hanapin ang mga kulisap, itlog, butas, batik, pagbabago ng kulay, hungkag na butil, o mabahong amoy',
      'Tandaan kung gaano kalawak ang tinamaan: ilang puno, isang bahagi, o ang buong palayan',
      'Kumuha ng malinaw na litrato ng apektadong bahagi at ipadala dito, o ilarawan ang nakikita ninyo',
      'Kung mabilis kumalat o maraming tanim ang namamatay, tawagan agad ang lokal na agriculturist',
    ],
    stepsCeb: [
      'Lakaw sa basakan nga pa-zigzag, dili lang sa kilid',
      'Susiha ang 10 ngadto sa 20 ka punoan sa lain-laing bahin: ang dahon, ang punoan ug tukog, ang bahin sa tubig, ug ang uhay',
      'Pangitaa ang mga insekto, itlog, lungag, tulbok, kausaban sa kolor, walay sulod nga lugas, o dautan nga baho',
      'Hinumdumi kung unsa kalapad ang naigo: pipila ka punoan, usa ka bahin, o ang tibuok basakan',
      'Pagkuha og klaro nga litrato sa apektado nga bahin ug ipadala dinhi, o isulti kung unsa ang inyong nakita',
      'Kung paspas mokaylap o daghang tanom ang nangamatay, tawagi dayon ang lokal nga agriculturist',
    ],
  },
];

/** The guide shown when the farmer asks what to do but nothing points to a problem yet. */
export const SCOUTING_GUIDE: CareGuide = RICE_GUIDES.find((g) => g.id === 'scouting')!;

function hits(guide: CareGuide, padded: string): number {
  return guide.keywords.filter((k) => padded.includes(` ${k} `)).length;
}

/**
 * The guide a question is about, or null. Rice only: a question that names corn, or a crop that is not rice, gets
 * no guide. Ties go to the guide listed first, so the planting overview wins over a single topic word.
 */
export function guideFor(text: string): CareGuide | null {
  if (detectCrop(text) === 'corn') return null;
  const padded = ` ${normalize(text)} `;
  let best: CareGuide | null = null;
  let bestHits = 0;
  for (const guide of RICE_GUIDES) {
    const n = hits(guide, padded);
    if (n > bestHits) {
      best = guide;
      bestHits = n;
    }
  }
  return best;
}

/**
 * The guide as the model reads it, after the farmer's question: the English steps, and the same steps in the
 * farmer's language, which keep the small model from mistranslating. An English question gets English only.
 */
export function guideNote(guide: CareGuide, lang: ReplyLanguage = 'tl'): string {
  const steps = `Guide: ${guide.topic}\nSteps: ${guide.steps.join('; ')}`;
  if (lang === 'en') return steps;
  return lang === 'ceb' ? `${steps}\nCebuano steps: ${guide.stepsCeb.join('; ')}` : `${steps}\nTagalog steps: ${guide.stepsTl.join('; ')}`;
}

/** The guide as the farmer reads it when no model answers: the title and the steps, numbered, in their language. */
export function guideReply(guide: CareGuide, lang: ReplyLanguage = 'tl'): string {
  const [title, steps] =
    lang === 'en' ? [guide.topic, guide.steps] : lang === 'ceb' ? [guide.titleCeb, guide.stepsCeb] : [guide.titleTl, guide.stepsTl];
  return `${title}:\n${steps.map((step, i) => `${i + 1}. ${step}.`).join('\n')}`;
}
