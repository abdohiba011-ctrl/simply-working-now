// Body HTML + FAQ for Article 1. Trilingual.
// Inline anchor links use absolute paths so the SPA router handles them.

export interface FaqItem {
  q: string;
  a: string;
}

export interface ArticleContent {
  body: { en: string; fr: string; ar: string };
  faq: { en: FaqItem[]; fr: FaqItem[]; ar: FaqItem[] };
}

const en = `
<p>Renting a motorbike or scooter in Morocco is the fastest way to escape city traffic, reach hidden coastal villages, and ride one of the most beautiful countries in the world. This guide covers everything you need: licenses, deposits, insurance, payment options, and how to actually book a bike in under 2 minutes.</p>
<p>We'll keep it simple. By the end of this article you'll know exactly what to do.</p>

<h2>Why rent a motorbike in Morocco?</h2>
<p>Morocco welcomed 19.8 million tourists in 2025, and is targeting 26 million by FIFA 2030. Yet most visitors still rely on grand taxis, overcrowded buses, or expensive car rentals. A motorbike or scooter solves three problems at once:</p>
<ul>
  <li><strong>City traffic.</strong> Casablanca's morning commute can stretch a 15-minute trip to over an hour. A scooter cuts that to 20 minutes.</li>
  <li><strong>Independence.</strong> No waiting on tour buses, no fixed schedules. Ride when you want, stop where you want.</li>
  <li><strong>Cost.</strong> Scooter rental in Morocco averages around 80 to 150 MAD per day. Far cheaper than a car rental, much more flexible than a taxi.</li>
</ul>
<p>Locals are increasingly turning to scooters too — especially in Casablanca, Marrakech, and Rabat where parking and traffic make car ownership painful.</p>

<h2>What you need before you rent</h2>
<p>Five things. Get these ready before you book.</p>

<h3>1. A valid driver's license</h3>
<p>What license you need depends on the bike's engine size:</p>
<ul>
  <li><strong>Under 50cc (small scooters):</strong> A standard car license (Permis B) is enough. Locals 16+ with a national ID can ride too.</li>
  <li><strong>50cc to 125cc:</strong> Permis A1 or equivalent (most European A1 / A2 licenses are accepted). Minimum age 18.</li>
  <li><strong>Above 125cc:</strong> Permis A. Minimum age usually 20–21, depending on the agency. Some agencies require 1+ years of riding experience.</li>
</ul>
<p>If your license is in a language other than Arabic, French, or English, get an <strong>International Driving Permit (IDP)</strong> before you travel. It's cheap, widely accepted, and avoids police hassles. Read our complete guide to motorbike licenses in Morocco for the full breakdown.</p>

<h3>2. A national ID or passport</h3>
<p>Locals: bring your CIN. Tourists: passport. Some agencies also ask for a photocopy.</p>

<h3>3. A refundable deposit</h3>
<p>Most agencies require a deposit (called "caution" in Moroccan French) ranging from 800 MAD for small scooters to 3,000 MAD for adventure motorbikes. The deposit is held on your credit card or paid in cash and refunded when you return the bike undamaged.</p>
<p>This is normal and expected — don't be alarmed. It's how every rental agency in Morocco operates.</p>

<h3>4. A clear understanding of insurance</h3>
<p>Every legal rental in Morocco includes basic third-party insurance (covers damage to others). What it does NOT typically cover:</p>
<ul>
  <li>Theft of the bike</li>
  <li>Damage to the bike itself</li>
  <li>Personal injury</li>
  <li>Off-road or piste damage</li>
</ul>
<p>If you want broader coverage, ask the agency about comprehensive insurance — usually 30 to 80 MAD per day extra. Worth it for adventure riding or long trips.</p>

<h3>5. The right bike for your trip</h3>
<p>Match the bike to your route:</p>
<ul>
  <li><strong>City riding only:</strong> 50cc or 125cc automatic scooter</li>
  <li><strong>Coastal day trips:</strong> 125cc scooter or 250cc motorbike</li>
  <li><strong>Atlas mountains, Sahara, multi-day touring:</strong> Adventure bikes (Yamaha XT, Honda CRF, BMW GS, Royal Enfield Himalayan)</li>
  <li><strong>Pure city errands, no license:</strong> 50cc scooter (some require only Permis B)</li>
</ul>

<h2>How Motonita works (3 steps)</h2>
<p>Motonita is Morocco's first peer-to-peer motorbike and scooter rental marketplace. We connect you directly with verified rental agencies across 16 cities. Here's how to book:</p>
<p><strong>Step 1 — Search.</strong> Open motonita.ma. Pick your city. Pick your neighborhood. Choose your dates. Hit search.</p>
<p><strong>Step 2 — Compare.</strong> Browse verified bikes. See real photos, exact specs, agency response time, and exact pickup location. Filter by bike type, fuel, license required, or price.</p>
<p><strong>Step 3 — Book.</strong> Click "Book Now" on the bike you want. Confirm your details. Pay the small booking fee. The agency receives your booking and confirms within 24 hours. You chat directly with them inside the app to coordinate pickup.</p>
<p>That's it. No hidden fees, no surprises, no foreign apps eating into the agency's revenue.</p>

<h2>Choosing a bike type — quick decision tree</h2>
<table>
  <thead><tr><th>If you...</th><th>Pick this</th></tr></thead>
  <tbody>
    <tr><td>Just need to get around the city</td><td>50cc–125cc automatic scooter</td></tr>
    <tr><td>Want to ride the coast</td><td>125cc scooter or naked roadster</td></tr>
    <tr><td>Are heading into the Atlas</td><td>250cc–650cc adventure bike</td></tr>
    <tr><td>Want to cross into the Sahara</td><td>650cc+ adventure bike, GS or XT class</td></tr>
    <tr><td>Have no motorcycle license</td><td>50cc scooter only</td></tr>
    <tr><td>Travel two-up (with passenger)</td><td>125cc minimum, 250cc preferred</td></tr>
  </tbody>
</table>

<h2>Pickup options across Morocco</h2>
<p>Most agencies offer three pickup options:</p>
<ul>
  <li><strong>Agency pickup</strong> — usually free, you collect the bike at their location</li>
  <li><strong>Hotel or address delivery</strong> — usually 25 to 100 MAD depending on distance</li>
  <li><strong>Airport delivery</strong> — 50 to 150 MAD, available in Casablanca (CMN), Marrakech (RAK), Tangier (TNG), Agadir (AGA)</li>
</ul>
<p>Confirm pickup details directly with the agency through Motonita's in-app chat after you book. Don't share phone numbers or move conversations off-platform — we audit chats specifically to protect both renters and agencies.</p>

<h2>Payment methods accepted</h2>
<p>Motonita's small booking fee is paid online through YouCan Pay, accepting:</p>
<ul>
  <li>Moroccan bank cards (CMI)</li>
  <li>International Visa, Mastercard</li>
  <li>Cash Plus (for users without a card — pay at any Cash Plus agent across Morocco)</li>
</ul>
<p>The rental itself is paid directly to the agency at pickup — usually cash, sometimes card. You arrange this with them through chat.</p>

<h2>Insurance: what you actually get</h2>
<p>This is the most confusing topic for first-time renters. Here's the real breakdown:</p>
<p><strong>Included with every legal rental:</strong> Third-party liability (covers others if you cause damage)</p>
<p><strong>Optional extra (recommended):</strong></p>
<ul>
  <li>Collision damage waiver — limits your financial liability if the bike is damaged</li>
  <li>Theft protection — covers if the bike is stolen during your rental</li>
  <li>Personal accident insurance — for medical costs if you crash</li>
</ul>
<p>If you're riding off-road, mountains, or doing multi-day trips: take the comprehensive option. If you're zipping around Casablanca for an afternoon: basic third-party is usually fine.</p>

<h2>First-time rider tips for Morocco</h2>
<p>If this is your first time riding in Morocco — read this carefully.</p>

<h3>Driving culture</h3>
<p>Morocco drives on the right. Speed limits: 60 km/h in cities, 80 km/h on secondary roads, 120 km/h on highways. Helmets are mandatory for the driver. Police checkpoints are common, especially on highways and at city entrances — they're usually fine, just stop, smile, hand over your documents.</p>

<h3>Casablanca and Marrakech traffic</h3>
<p>These cities are intense. Expect:</p>
<ul>
  <li>Sudden lane changes</li>
  <li>Pedestrians crossing without warning</li>
  <li>Other scooters splitting lanes aggressively</li>
  <li>Roundabouts that operate on assertion, not rules</li>
</ul>
<p>If you're not comfortable with high-density urban riding, start with a small scooter and pick a quieter neighborhood for your first ride. Bouskoura and Anfa in Casablanca are calmer than the city center.</p>

<h3>Mountain and desert routes</h3>
<p>The Tizi n'Tichka pass (Marrakech to Ouarzazate), Tizi n'Test (Marrakech to Taroudant), and the Sahara routes (Erg Chebbi, Erg Chigaga) are stunning but demanding. Ensure your bike has fresh tires, working brakes, and a basic toolkit. Rent comprehensive insurance. Don't ride at night in remote areas.</p>

<h2>Common booking mistakes to avoid</h2>
<ol>
  <li><strong>Booking without checking license requirements.</strong> Every Motonita listing shows the required license type. Check before you click Book.</li>
  <li><strong>Forgetting the deposit.</strong> Have 1,000–3,000 MAD available on your card or in cash for the deposit at pickup.</li>
  <li><strong>Pickup confusion.</strong> Confirm exact pickup time and address through the in-app chat 24 hours before. Save the agency's contact in your phone.</li>
  <li><strong>No backup plan for breakdowns.</strong> Take a phone with data. Most agencies offer 24/7 roadside support — confirm this in advance.</li>
  <li><strong>Skipping inspection at pickup.</strong> Walk around the bike with the agency. Note any existing scratches or damage in writing or on photo. Protects you when you return it.</li>
</ol>

<h2>Frequently Asked Questions</h2>

<h3>Can I rent a motorbike in Morocco without a motorcycle license?</h3>
<p>Yes — for small 50cc scooters. A standard car license (Permis B) covers 50cc and below. Anything above 50cc requires a motorcycle license (A1 or A).</p>

<h3>Are foreign motorbike licenses valid in Morocco?</h3>
<p>Generally yes — European A1, A2, and A licenses are accepted. We strongly recommend an International Driving Permit alongside your home license to avoid issues at police checkpoints.</p>

<h3>How much does it cost to rent a motorbike in Morocco?</h3>
<p>Prices vary widely by bike and duration. Small scooters start around 80 MAD per day. 125cc bikes typically run 100–150 MAD per day. Adventure bikes range from 350 to 800 MAD per day. Weekly and monthly rentals offer discounts.</p>

<h3>Is rental insurance enough?</h3>
<p>Basic third-party insurance is included by law. For mountain or desert riding, take the comprehensive option. For city use, basic is usually fine.</p>

<h3>Can tourists rent motorbikes in Morocco?</h3>
<p>Absolutely. Morocco is one of the most popular motorbike rental destinations in North Africa. Bring your home license, an International Driving Permit, and your passport.</p>

<h3>How far in advance should I book?</h3>
<p>For peak season (March–May, September–November) book 2–4 weeks in advance. For off-peak, a few days is usually enough. Last-minute bookings are possible but limit your choices.</p>

<h2>Ready to rent?</h2>
<p>Browse verified bikes across Morocco. Pick your city, choose your neighborhood, and book in 60 seconds.</p>
<ul>
  <li>→ <a href="/rent/casablanca">Browse all bikes in Casablanca</a></li>
  <li>→ <a href="/blog/motorbike-license-morocco-guide">Read the license guide</a></li>
  <li>→ <a href="/blog/best-motorbike-routes-morocco">Discover the best riding routes</a></li>
</ul>
`;

const fr = `
<p>Louer une moto ou un scooter au Maroc est le moyen le plus rapide d'échapper à la circulation urbaine, d'atteindre des villages côtiers cachés et de parcourir l'un des plus beaux pays au monde. Ce guide couvre tout ce dont vous avez besoin : permis, cautions, assurance, options de paiement et comment réserver une moto en moins de 2 minutes.</p>
<p>Nous resterons simples. À la fin de cet article, vous saurez exactement quoi faire.</p>

<h2>Pourquoi louer une moto au Maroc ?</h2>
<p>Le Maroc a accueilli 19,8 millions de touristes en 2025 et vise 26 millions d'ici la Coupe du Monde FIFA 2030. Pourtant, la plupart des visiteurs comptent encore sur les grands taxis, des bus bondés ou des locations de voiture coûteuses. Une moto ou un scooter résout trois problèmes d'un coup :</p>
<ul>
  <li><strong>La circulation en ville.</strong> Le trajet du matin à Casablanca peut transformer 15 minutes en plus d'une heure. Un scooter ramène ça à 20 minutes.</li>
  <li><strong>L'indépendance.</strong> Pas d'attente pour les bus touristiques, pas d'horaires fixes. Roulez quand vous voulez, arrêtez-vous où vous voulez.</li>
  <li><strong>Le coût.</strong> La location de scooter au Maroc tourne autour de 80 à 150 MAD par jour. Bien moins cher qu'une voiture, bien plus flexible qu'un taxi.</li>
</ul>
<p>Les locaux se tournent aussi de plus en plus vers les scooters — surtout à Casablanca, Marrakech et Rabat où le stationnement et la circulation rendent la voiture pénible.</p>

<h2>Ce qu'il vous faut avant de louer</h2>
<p>Cinq choses. Préparez-les avant de réserver.</p>

<h3>1. Un permis de conduire valide</h3>
<p>Le permis dont vous avez besoin dépend de la cylindrée :</p>
<ul>
  <li><strong>Moins de 50cc (petits scooters) :</strong> Un permis voiture standard (Permis B) suffit. Les locaux de 16 ans et plus avec une CIN peuvent aussi conduire.</li>
  <li><strong>50cc à 125cc :</strong> Permis A1 ou équivalent (la plupart des A1 / A2 européens sont acceptés). Âge minimum 18 ans.</li>
  <li><strong>Au-dessus de 125cc :</strong> Permis A. Âge minimum généralement 20–21 ans, selon l'agence. Certaines exigent 1 an d'expérience minimum.</li>
</ul>
<p>Si votre permis est dans une langue autre que l'arabe, le français ou l'anglais, prenez un <strong>Permis International (PIDC)</strong> avant de partir. Il est bon marché, largement accepté et évite les soucis avec la police. Lisez notre guide complet des permis moto au Maroc pour tous les détails.</p>

<h3>2. Une CIN ou un passeport</h3>
<p>Locaux : apportez votre CIN. Touristes : passeport. Certaines agences demandent aussi une photocopie.</p>

<h3>3. Une caution remboursable</h3>
<p>La plupart des agences exigent une caution allant de 800 MAD pour les petits scooters à 3 000 MAD pour les motos d'aventure. La caution est bloquée sur votre carte ou payée en espèces et remboursée au retour du véhicule en bon état.</p>
<p>C'est normal et attendu — pas de panique. C'est ainsi que toute agence de location au Maroc fonctionne.</p>

<h3>4. Bien comprendre l'assurance</h3>
<p>Toute location légale au Maroc inclut une assurance responsabilité civile de base (couvre les dommages aux tiers). Ce qu'elle NE couvre PAS habituellement :</p>
<ul>
  <li>Le vol de la moto</li>
  <li>Les dommages à la moto elle-même</li>
  <li>Les blessures personnelles</li>
  <li>Les dommages hors-route ou piste</li>
</ul>
<p>Pour une couverture plus large, demandez à l'agence l'assurance tous risques — généralement 30 à 80 MAD par jour en plus. Recommandé pour les randos ou longs voyages.</p>

<h3>5. La bonne moto pour votre voyage</h3>
<p>Adaptez la moto à votre itinéraire :</p>
<ul>
  <li><strong>Conduite en ville uniquement :</strong> scooter automatique 50cc ou 125cc</li>
  <li><strong>Excursions côtières :</strong> scooter 125cc ou moto 250cc</li>
  <li><strong>Atlas, Sahara, longs voyages :</strong> motos d'aventure (Yamaha XT, Honda CRF, BMW GS, Royal Enfield Himalayan)</li>
  <li><strong>Courses urbaines, sans permis moto :</strong> scooter 50cc (souvent Permis B suffit)</li>
</ul>

<h2>Comment fonctionne Motonita (3 étapes)</h2>
<p>Motonita est la première marketplace peer-to-peer de location de motos et scooters au Maroc. Nous vous connectons directement à des agences vérifiées dans 16 villes. Voici comment réserver :</p>
<p><strong>Étape 1 — Recherche.</strong> Ouvrez motonita.ma. Choisissez votre ville. Votre quartier. Vos dates. Lancez la recherche.</p>
<p><strong>Étape 2 — Comparez.</strong> Parcourez les motos vérifiées. Vraies photos, fiches techniques, temps de réponse, lieu exact de prise en charge. Filtrez par type, carburant, permis requis ou prix.</p>
<p><strong>Étape 3 — Réservez.</strong> Cliquez "Réserver" sur la moto choisie. Confirmez vos infos. Payez les frais de réservation. L'agence reçoit votre demande et confirme sous 24h. Vous discutez directement avec elle dans l'app pour la prise en charge.</p>
<p>C'est tout. Pas de frais cachés, pas de surprises, pas d'appli étrangère qui prend une commission sur l'agence.</p>

<h2>Choisir le type de moto — arbre de décision</h2>
<table>
  <thead><tr><th>Si vous...</th><th>Choisissez</th></tr></thead>
  <tbody>
    <tr><td>Voulez juste vous déplacer en ville</td><td>scooter automatique 50–125cc</td></tr>
    <tr><td>Voulez longer la côte</td><td>scooter 125cc ou roadster</td></tr>
    <tr><td>Partez dans l'Atlas</td><td>moto d'aventure 250–650cc</td></tr>
    <tr><td>Voulez traverser le Sahara</td><td>aventure 650cc+, classe GS ou XT</td></tr>
    <tr><td>N'avez pas de permis moto</td><td>scooter 50cc uniquement</td></tr>
    <tr><td>Voyagez à deux</td><td>125cc minimum, 250cc préféré</td></tr>
  </tbody>
</table>

<h2>Options de prise en charge au Maroc</h2>
<p>La plupart des agences proposent trois options :</p>
<ul>
  <li><strong>Prise en charge à l'agence</strong> — généralement gratuit, vous récupérez la moto sur place</li>
  <li><strong>Livraison hôtel ou adresse</strong> — généralement 25 à 100 MAD selon la distance</li>
  <li><strong>Livraison aéroport</strong> — 50 à 150 MAD, disponible à Casablanca (CMN), Marrakech (RAK), Tanger (TNG), Agadir (AGA)</li>
</ul>
<p>Confirmez les détails directement avec l'agence via le chat Motonita après réservation. Ne partagez pas de numéros de téléphone et ne sortez pas du chat — nous auditons les conversations pour protéger renters et agences.</p>

<h2>Moyens de paiement acceptés</h2>
<p>Les frais de réservation Motonita sont payés en ligne via YouCan Pay, qui accepte :</p>
<ul>
  <li>Cartes bancaires marocaines (CMI)</li>
  <li>Visa, Mastercard internationales</li>
  <li>Cash Plus (pour les utilisateurs sans carte — payez chez n'importe quel agent Cash Plus au Maroc)</li>
</ul>
<p>La location elle-même est payée directement à l'agence au moment de la prise en charge — généralement en espèces, parfois par carte. Vous l'organisez avec elle via le chat.</p>

<h2>Assurance : ce que vous obtenez réellement</h2>
<p>C'est le sujet le plus confus pour les nouveaux locataires. Voici la vraie répartition :</p>
<p><strong>Inclus dans toute location légale :</strong> Responsabilité civile (couvre les autres si vous causez un dommage)</p>
<p><strong>Options recommandées :</strong></p>
<ul>
  <li>Rachat de franchise — limite votre responsabilité financière en cas de dommage</li>
  <li>Protection vol — couvre si la moto est volée pendant la location</li>
  <li>Assurance accident personnel — pour les frais médicaux en cas de chute</li>
</ul>
<p>Hors-route, montagne, ou voyages sur plusieurs jours : prenez la formule complète. Pour un après-midi à Casablanca : la base suffit.</p>

<h2>Conseils pour les nouveaux conducteurs au Maroc</h2>
<p>Si c'est votre première fois — lisez attentivement.</p>

<h3>Culture de conduite</h3>
<p>On roule à droite au Maroc. Limites : 60 km/h en ville, 80 km/h sur routes secondaires, 120 km/h sur autoroute. Le casque est obligatoire pour le conducteur. Les contrôles de police sont fréquents — restez calme, souriez, présentez vos papiers.</p>

<h3>Trafic à Casablanca et Marrakech</h3>
<p>Ces villes sont intenses. Attendez-vous à :</p>
<ul>
  <li>Des changements de file soudains</li>
  <li>Des piétons qui traversent sans prévenir</li>
  <li>D'autres scooters qui s'infiltrent agressivement</li>
  <li>Des ronds-points qui fonctionnent à l'affirmation, pas aux règles</li>
</ul>
<p>Si vous n'êtes pas à l'aise en ville dense, commencez par un petit scooter dans un quartier plus calme. Bouskoura et Anfa à Casablanca sont plus tranquilles que le centre.</p>

<h3>Itinéraires montagne et désert</h3>
<p>Le col du Tizi n'Tichka (Marrakech à Ouarzazate), le Tizi n'Test (Marrakech à Taroudant) et les routes du Sahara (Erg Chebbi, Erg Chigaga) sont magnifiques mais exigeants. Vérifiez pneus, freins et apportez un kit d'outils basique. Prenez l'assurance complète. Ne roulez pas la nuit dans les zones isolées.</p>

<h2>Erreurs courantes à éviter</h2>
<ol>
  <li><strong>Réserver sans vérifier le permis requis.</strong> Chaque annonce Motonita indique le permis nécessaire. Vérifiez avant de cliquer Réserver.</li>
  <li><strong>Oublier la caution.</strong> Ayez 1 000–3 000 MAD disponibles sur votre carte ou en espèces.</li>
  <li><strong>Confusion à la prise en charge.</strong> Confirmez heure et adresse exactes 24h avant via le chat. Enregistrez le contact de l'agence.</li>
  <li><strong>Pas de plan B en cas de panne.</strong> Téléphone avec données. La plupart des agences offrent un dépannage 24/7 — confirmez à l'avance.</li>
  <li><strong>Sauter l'inspection.</strong> Faites le tour avec l'agent. Notez rayures et dommages existants par écrit ou en photo. Cela vous protège au retour.</li>
</ol>

<h2>Questions fréquentes</h2>

<h3>Puis-je louer une moto au Maroc sans permis moto ?</h3>
<p>Oui — pour les petits scooters 50cc. Le permis voiture (Permis B) couvre 50cc et moins. Au-dessus, il faut un permis moto (A1 ou A).</p>

<h3>Les permis moto étrangers sont-ils valides au Maroc ?</h3>
<p>En général oui — les permis européens A1, A2 et A sont acceptés. Nous recommandons fortement un Permis International en complément pour éviter les soucis aux contrôles de police.</p>

<h3>Combien coûte la location d'une moto au Maroc ?</h3>
<p>Les prix varient selon la moto et la durée. Petits scooters dès 80 MAD/jour. 125cc autour de 100–150 MAD/jour. Motos d'aventure entre 350 et 800 MAD/jour. Tarifs dégressifs à la semaine ou au mois.</p>

<h3>L'assurance de location suffit-elle ?</h3>
<p>La responsabilité civile de base est incluse par la loi. Pour la montagne ou le désert, prenez la formule complète. Pour la ville, la base suffit généralement.</p>

<h3>Les touristes peuvent-ils louer des motos au Maroc ?</h3>
<p>Absolument. Le Maroc est l'une des destinations de location moto les plus populaires d'Afrique du Nord. Apportez permis, Permis International et passeport.</p>

<h3>Combien de temps à l'avance faut-il réserver ?</h3>
<p>En haute saison (mars–mai, septembre–novembre) réservez 2 à 4 semaines à l'avance. Hors saison, quelques jours suffisent. Le dernier minute est possible mais le choix sera limité.</p>

<h2>Prêt à louer ?</h2>
<p>Parcourez les motos vérifiées au Maroc. Choisissez votre ville, votre quartier, et réservez en 60 secondes.</p>
<ul>
  <li>→ <a href="/rent/casablanca">Toutes les motos à Casablanca</a></li>
  <li>→ <a href="/blog/motorbike-license-morocco-guide">Lire le guide des permis</a></li>
  <li>→ <a href="/blog/best-motorbike-routes-morocco">Découvrir les meilleurs itinéraires</a></li>
</ul>
`;

const ar = `
<p>كراء موطور أو سكوتر في المغرب هو أسرع طريقة باش تهرب من زحمة المدينة، توصل لقرى ساحلية مخفية، وتكتشف واحد من أجمل البلدان في العالم. هاد الدليل كيغطي كل شي: الرخص، الكوسيون، التأمين، طرق الدفع، وكيفاش تحجز موطور في أقل من دقيقتين.</p>
<p>غادي نخليوها بسيطة. ملي تكمل قراءة هاد المقال، غادي تعرف بالضبط أش خاصك دير.</p>

<h2>علاش تكري موطور في المغرب؟</h2>
<p>المغرب استقبل 19.8 مليون سائح فالعام 2025، والهدف ديالو 26 مليون قبل كأس العالم 2030. ولكن أغلب الزوار باقيين كيعتمدو على الطاكسيات الكبار، الطوبيسات الزاحمة، ولا كراء الطوموبيلات الغالي. الموطور ولا السكوتر كيحل ثلاث مشاكل دفعة وحدة:</p>
<ul>
  <li><strong>زحمة المدينة.</strong> تنقل الصباح فالدار البيضاء يقدر يخوض رحلة من 15 دقيقة لأكثر من ساعة. السكوتر كيخفضها لـ20 دقيقة.</li>
  <li><strong>الاستقلالية.</strong> ما كاينش انتظار طوبيسات السياحة، ما كاينش مواعيد ثابتة. سوق فاش بغيتي، وقف فين بغيتي.</li>
  <li><strong>التكلفة.</strong> كراء السكوتر فالمغرب كيدور حوالي 80 إلى 150 درهم فاليوم. أرخص بزاف من كراء طوموبيل، وأكثر مرونة من الطاكسي.</li>
</ul>
<p>الناس المحليين كيرجعو حتى هما للسكوترات — خصوصا فالدار البيضاء، مراكش، والرباط فين البلاصة والزحمة كيجعلو ملكية الطوموبيل صعيبة.</p>

<h2>أش خاصك قبل ما تكري</h2>
<p>خمس أشياء. وجدها قبل ما تحجز.</p>

<h3>1. رخصة سياقة سارية</h3>
<p>الرخصة اللي خاصك كتعتمد على حجم محرك الموطور:</p>
<ul>
  <li><strong>أقل من 50cc (سكوترات صغيرة):</strong> رخصة طوموبيل عادية (Permis B) كافية. المحليين 16 سنة فما فوق برخصة CIN يقدرو يسوقو.</li>
  <li><strong>من 50cc إلى 125cc:</strong> Permis A1 أو ما يعادله (أغلب رخص A1 / A2 الأوروبية مقبولة). السن الأدنى 18.</li>
  <li><strong>فوق 125cc:</strong> Permis A. السن الأدنى عادة 20–21، حسب الوكالة. بعض الوكالات كتطلب سنة خبرة على الأقل.</li>
</ul>
<p>إلا كانت الرخصة ديالك بلغة غير العربية، الفرنسية، أو الإنجليزية، خود <strong>الرخصة الدولية (IDP)</strong> قبل ما تسافر. رخيصة، مقبولة على نطاق واسع، وكتجنبك مشاكل البوليس. اقرا الدليل الشامل ديالنا حول رخص الموطور فالمغرب لكل التفاصيل.</p>

<h3>2. CIN ولا الباسبور</h3>
<p>المحليين: جيب CIN ديالك. السياح: الباسبور. بعض الوكالات كتطلب حتى نسخة.</p>

<h3>3. كوسيون قابل للاسترجاع</h3>
<p>أغلب الوكالات كتطلب كوسيون كيتراوح من 800 درهم للسكوترات الصغيرة لـ3,000 درهم لموطورات المغامرة. الكوسيون كيتحجز فالكارت ديالك ولا كيخلص نقدا، وكيرجع لك ملي ترجع الموطور بلا ضرر.</p>
<p>هادشي عادي ومتوقع — ما تخافش. هكذا كاتخدم كل وكالة كراء فالمغرب.</p>

<h3>4. فهم واضح للتأمين</h3>
<p>كل كراء قانوني فالمغرب كيتضمن تأمين أساسي ضد الغير (كيغطي الأضرار للآخرين). أش ما كيغطيش عادة:</p>
<ul>
  <li>سرقة الموطور</li>
  <li>الأضرار اللي كتلحق الموطور بحالو</li>
  <li>الإصابات الشخصية</li>
  <li>أضرار خارج الطريق ولا فالبيست</li>
</ul>
<p>إلا بغيتي تغطية أوسع، سول الوكالة على التأمين الشامل — عادة 30 إلى 80 درهم زائد فاليوم. مفيد للمغامرة ولا الرحلات الطويلة.</p>

<h3>5. الموطور المناسب لرحلتك</h3>
<p>وافق بين الموطور والطريق:</p>
<ul>
  <li><strong>سياقة فالمدينة فقط:</strong> سكوتر أوتوماتيكي 50cc ولا 125cc</li>
  <li><strong>رحلات ساحلية يومية:</strong> سكوتر 125cc ولا موطور 250cc</li>
  <li><strong>جبال الأطلس، الصحراء، رحلات متعددة الأيام:</strong> موطورات المغامرة (Yamaha XT، Honda CRF، BMW GS، Royal Enfield Himalayan)</li>
  <li><strong>مشاوير المدينة، بلا رخصة موطور:</strong> سكوتر 50cc (بعضها كيكفيها Permis B)</li>
</ul>

<h2>كيفاش كتخدم Motonita (3 خطوات)</h2>
<p>Motonita هي أول منصة كراء موطورات وسكوترات شخص لشخص فالمغرب. كنربطوك مباشرة بوكالات كراء معتمدة فـ16 مدينة. هاهي طريقة الحجز:</p>
<p><strong>الخطوة 1 — البحث.</strong> دخل لـmotonita.ma. اختار المدينة. الحي. التواريخ. اضغط بحث.</p>
<p><strong>الخطوة 2 — قارن.</strong> تصفح الموطورات المعتمدة. صور حقيقية، مواصفات دقيقة، وقت رد الوكالة، ومكان الاستلام بالضبط. فلتر حسب النوع، الوقود، الرخصة المطلوبة، أو السعر.</p>
<p><strong>الخطوة 3 — احجز.</strong> اضغط "احجز الآن" على الموطور اللي بغيتي. أكد المعلومات. خلص رسوم الحجز الصغيرة. الوكالة كتاخد الحجز ديالك وكتأكد فأقل من 24 ساعة. كتدور معاها مباشرة فالتطبيق باش تنسقو الاستلام.</p>
<p>هاد هو. بلا رسوم خفية، بلا مفاجآت، بلا تطبيقات أجنبية كتاكل من مدخول الوكالة.</p>

<h2>اختيار نوع الموطور — شجرة قرار سريعة</h2>
<table>
  <thead><tr><th>إلا كنتي...</th><th>اختار هاد</th></tr></thead>
  <tbody>
    <tr><td>محتاج تتنقل فالمدينة فقط</td><td>سكوتر أوتوماتيكي 50–125cc</td></tr>
    <tr><td>بغيتي تركب على الساحل</td><td>سكوتر 125cc ولا روادستر</td></tr>
    <tr><td>غادي للأطلس</td><td>موطور مغامرة 250–650cc</td></tr>
    <tr><td>بغيتي تعبر الصحراء</td><td>مغامرة 650cc+، فئة GS ولا XT</td></tr>
    <tr><td>ما عندكش رخصة موطور</td><td>سكوتر 50cc فقط</td></tr>
    <tr><td>كتسافر مع راكب</td><td>125cc كحد أدنى، 250cc مفضل</td></tr>
  </tbody>
</table>

<h2>خيارات الاستلام عبر المغرب</h2>
<p>أغلب الوكالات كتعرض ثلاث خيارات:</p>
<ul>
  <li><strong>الاستلام من الوكالة</strong> — عادة مجاني، كتجي تاخد الموطور من المكان ديالها</li>
  <li><strong>التوصيل للأوتيل ولا للعنوان</strong> — عادة 25 إلى 100 درهم حسب المسافة</li>
  <li><strong>التوصيل للمطار</strong> — 50 إلى 150 درهم، متوفر فالدار البيضاء (CMN)، مراكش (RAK)، طنجة (TNG)، أكادير (AGA)</li>
</ul>
<p>أكد تفاصيل الاستلام مباشرة مع الوكالة عبر شات Motonita بعد ما تحجز. ما تشاركش أرقام الهاتف وما تخرجش من الشات — كنراقبو المحادثات باش نحميو الكريين والوكالات.</p>

<h2>طرق الدفع المقبولة</h2>
<p>رسوم حجز Motonita الصغيرة كتخلص أونلاين عبر YouCan Pay، وكتقبل:</p>
<ul>
  <li>الكارط البنكية المغربية (CMI)</li>
  <li>Visa، Mastercard دوليا</li>
  <li>Cash Plus (للمستخدمين بلا كارط — خلص فأي وكيل Cash Plus عبر المغرب)</li>
</ul>
<p>الكراء بحالو كيتخلص مباشرة للوكالة فالاستلام — عادة نقدا، أحيانا بالكارط. كتفاهم معاهم عبر الشات.</p>

<h2>التأمين: أش كتاخد فعلا</h2>
<p>هاد الموضوع الأكثر تشويش عند المبتدئين. هاهي الحقيقة:</p>
<p><strong>متضمن فكل كراء قانوني:</strong> المسؤولية المدنية ضد الغير (كيغطي الآخرين إلا سببتي ضرر)</p>
<p><strong>خيارات إضافية موصى بها:</strong></p>
<ul>
  <li>تنازل عن الفرانشيز — كيحدد المسؤولية المالية ديالك إلا تضرر الموطور</li>
  <li>حماية ضد السرقة — كيغطي إلا اتسرق الموطور خلال الكراء</li>
  <li>تأمين الحوادث الشخصية — للتكاليف الطبية فحالة طاحت</li>
</ul>
<p>إلا كنتي غادي خارج الطريق، فالجبال، ولا رحلات متعددة الأيام: خود الخيار الشامل. إلا كنتي كتدور فالدار البيضاء عشية: الأساسي كافي.</p>

<h2>نصائح للسائقين الجدد فالمغرب</h2>
<p>إلا هاد المرة الأولى ديالك فالمغرب — اقرا بانتباه.</p>

<h3>ثقافة السياقة</h3>
<p>فالمغرب كنسوقو على اليمين. حدود السرعة: 60 كم/س فالمدن، 80 كم/س فالطرق الثانوية، 120 كم/س فالأوطوروت. الكاسك إجباري للسائق. حواجز البوليس كثيرة — كون هادي، اضحك، قدم الأوراق.</p>

<h3>زحمة الدار البيضاء ومراكش</h3>
<p>هاد المدن مكثفة. توقع:</p>
<ul>
  <li>تغييرات مفاجئة فالكوار</li>
  <li>راجلين كيقطعو بلا تحذير</li>
  <li>سكوترات أخرى كتدخل بشراسة</li>
  <li>الدوارات اللي كتخدم بالحضور، ماشي بالقواعد</li>
</ul>
<p>إلا ما كنتيش مرتاح فالسياقة الكثيفة، بدا بسكوتر صغير واختار حي هادي للركوبة الأولى. بوسكورة وأنفا فالدار البيضاء أهدا من وسط المدينة.</p>

<h3>مسارات الجبل والصحراء</h3>
<p>تيزي ن'تيشكا (مراكش لورزازات)، تيزي ن'تست (مراكش لتارودانت)، ومسارات الصحراء (إرغ شبي، إرغ شيغاغا) رائعة ولكن صعيبة. تأكد من بنوات جدد، فرامل خدامين، وعدة أدوات أساسية. خود التأمين الشامل. ما تركبش بالليل فالمناطق المعزولة.</p>

<h2>أخطاء الحجز اللي خاصك تجنبها</h2>
<ol>
  <li><strong>الحجز بلا التحقق من الرخصة المطلوبة.</strong> كل عرض فMotonita كيبين نوع الرخصة. تحقق قبل ما تضغط احجز.</li>
  <li><strong>نسيان الكوسيون.</strong> خلي 1,000–3,000 درهم متوفرة فالكارط ولا نقدا للكوسيون عند الاستلام.</li>
  <li><strong>تشويش فالاستلام.</strong> أكد الوقت والعنوان بالضبط 24 ساعة قبل عبر الشات. سجل رقم الوكالة.</li>
  <li><strong>بلا خطة بديلة للأعطاب.</strong> خود تيليفون بالداتا. أغلب الوكالات كتعرض دعم الطريق 24/7 — أكد ذلك مسبقا.</li>
  <li><strong>تخطي الفحص عند الاستلام.</strong> دور حول الموطور مع الوكالة. سجل أي خدش ولا ضرر موجود كتابيا ولا فالصور. كيحميك ملي ترجعو.</li>
</ol>

<h2>الأسئلة الشائعة</h2>

<h3>واش نقدر نكري موطور فالمغرب بلا رخصة موطور؟</h3>
<p>إيه — للسكوترات الصغيرة 50cc. رخصة طوموبيل عادية (Permis B) كتغطي 50cc وأقل. أي شي أكثر من 50cc كيتطلب رخصة موطور (A1 ولا A).</p>

<h3>واش رخص الموطور الأجنبية صالحة فالمغرب؟</h3>
<p>عموما إيه — رخص أوروبية A1، A2، وA مقبولة. كنوصيو بشدة بالرخصة الدولية مع الرخصة الأصلية باش تتجنب مشاكل فالحواجز.</p>

<h3>شحال كيكلف كراء موطور فالمغرب؟</h3>
<p>الأسعار كتختلف حسب الموطور والمدة. سكوترات صغيرة من 80 درهم/يوم. 125cc عادة 100–150 درهم/يوم. موطورات المغامرة من 350 إلى 800 درهم/يوم. تخفيضات أسبوعية وشهرية.</p>

<h3>واش تأمين الكراء كافي؟</h3>
<p>التأمين الأساسي ضد الغير متضمن قانونيا. للجبل والصحراء، خود الخيار الشامل. للمدينة، الأساسي عادة كافي.</p>

<h3>واش السياح يقدرو يكريو موطورات فالمغرب؟</h3>
<p>طبعا. المغرب من أكثر الوجهات شعبية لكراء الموطور فشمال أفريقيا. جيب الرخصة، الرخصة الدولية، والباسبور.</p>

<h3>قداش من قبل خاصني نحجز؟</h3>
<p>فالموسم الذروة (مارس–ماي، شتنبر–نونبر) احجز 2–4 أسابيع قبل. خارج الموسم، بضع أيام كافية. الحجز فآخر لحظة ممكن لكن الخيارات تكون محدودة.</p>

<h2>مستعد تكري؟</h2>
<p>تصفح الموطورات المعتمدة عبر المغرب. اختار المدينة، الحي، واحجز فـ60 ثانية.</p>
<ul>
  <li>← <a href="/rent/casablanca">جميع الموطورات فالدار البيضاء</a></li>
  <li>← <a href="/blog/motorbike-license-morocco-guide">دليل الرخص</a></li>
  <li>← <a href="/blog/best-motorbike-routes-morocco">أحسن المسارات</a></li>
</ul>
`;

const article: ArticleContent = {
  body: { en, fr, ar },
  faq: {
    en: [
      { q: "Can I rent a motorbike in Morocco without a motorcycle license?", a: "Yes — for small 50cc scooters. A standard car license (Permis B) covers 50cc and below. Anything above 50cc requires a motorcycle license (A1 or A)." },
      { q: "Are foreign motorbike licenses valid in Morocco?", a: "Generally yes — European A1, A2, and A licenses are accepted. We strongly recommend an International Driving Permit alongside your home license to avoid issues at police checkpoints." },
      { q: "How much does it cost to rent a motorbike in Morocco?", a: "Prices vary widely by bike and duration. Small scooters start around 80 MAD per day. 125cc bikes typically run 100–150 MAD per day. Adventure bikes range from 350 to 800 MAD per day. Weekly and monthly rentals offer discounts." },
      { q: "Is rental insurance enough?", a: "Basic third-party insurance is included by law. For mountain or desert riding, take the comprehensive option. For city use, basic is usually fine." },
      { q: "Can tourists rent motorbikes in Morocco?", a: "Absolutely. Morocco is one of the most popular motorbike rental destinations in North Africa. Bring your home license, an International Driving Permit, and your passport." },
      { q: "How far in advance should I book?", a: "For peak season (March–May, September–November) book 2–4 weeks in advance. For off-peak, a few days is usually enough. Last-minute bookings are possible but limit your choices." },
    ],
    fr: [
      { q: "Puis-je louer une moto au Maroc sans permis moto ?", a: "Oui — pour les petits scooters 50cc. Le permis voiture (Permis B) couvre 50cc et moins. Au-dessus, il faut un permis moto (A1 ou A)." },
      { q: "Les permis moto étrangers sont-ils valides au Maroc ?", a: "En général oui — les permis européens A1, A2 et A sont acceptés. Nous recommandons fortement un Permis International en complément pour éviter les soucis aux contrôles." },
      { q: "Combien coûte la location d'une moto au Maroc ?", a: "Les prix varient selon la moto et la durée. Petits scooters dès 80 MAD/jour. 125cc autour de 100–150 MAD/jour. Motos d'aventure entre 350 et 800 MAD/jour. Tarifs dégressifs à la semaine ou au mois." },
      { q: "L'assurance de location suffit-elle ?", a: "La responsabilité civile de base est incluse par la loi. Pour la montagne ou le désert, prenez la formule complète. Pour la ville, la base suffit généralement." },
      { q: "Les touristes peuvent-ils louer des motos au Maroc ?", a: "Absolument. Le Maroc est l'une des destinations de location moto les plus populaires d'Afrique du Nord. Apportez permis, Permis International et passeport." },
      { q: "Combien de temps à l'avance faut-il réserver ?", a: "En haute saison (mars–mai, septembre–novembre) réservez 2 à 4 semaines à l'avance. Hors saison, quelques jours suffisent. Le dernier minute est possible mais le choix sera limité." },
    ],
    ar: [
      { q: "واش نقدر نكري موطور فالمغرب بلا رخصة موطور؟", a: "إيه — للسكوترات الصغيرة 50cc. رخصة طوموبيل عادية (Permis B) كتغطي 50cc وأقل. أي شي أكثر من 50cc كيتطلب رخصة موطور (A1 ولا A)." },
      { q: "واش رخص الموطور الأجنبية صالحة فالمغرب؟", a: "عموما إيه — رخص أوروبية A1، A2، وA مقبولة. كنوصيو بشدة بالرخصة الدولية مع الرخصة الأصلية باش تتجنب مشاكل فالحواجز." },
      { q: "شحال كيكلف كراء موطور فالمغرب؟", a: "الأسعار كتختلف حسب الموطور والمدة. سكوترات صغيرة من 80 درهم/يوم. 125cc عادة 100–150 درهم/يوم. موطورات المغامرة من 350 إلى 800 درهم/يوم." },
      { q: "واش تأمين الكراء كافي؟", a: "التأمين الأساسي ضد الغير متضمن قانونيا. للجبل والصحراء، خود الخيار الشامل. للمدينة، الأساسي كافي." },
      { q: "واش السياح يقدرو يكريو موطورات فالمغرب؟", a: "طبعا. المغرب من أكثر الوجهات شعبية لكراء الموطور فشمال أفريقيا. جيب الرخصة، الرخصة الدولية، والباسبور." },
      { q: "قداش من قبل خاصني نحجز؟", a: "فالموسم الذروة (مارس–ماي، شتنبر–نونبر) احجز 2–4 أسابيع قبل. خارج الموسم، بضع أيام كافية." },
    ],
  },
};

export default article;
