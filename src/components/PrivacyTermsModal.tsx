import { forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  type: "privacy" | "terms";
}

export const PrivacyTermsModal = forwardRef<HTMLDivElement, PrivacyTermsModalProps>(({ isOpen, onClose, onAccept, type }, _ref) => {
  const { t, language } = useLanguage();

  const privacyContent = language === 'ar' ? (
    <div className="space-y-4 text-sm text-right" dir="rtl">
      <h3 className="font-semibold text-lg">سياسة الخصوصية - موتوري.ما</h3>
      <p>آخر تحديث: ديسمبر 2024</p>
      
      <h4 className="font-semibold mt-4">1. المعلومات التي نجمعها</h4>
      <p>نقوم بجمع المعلومات الشخصية التي تقدمها لنا مباشرة، بما في ذلك:</p>
      <ul className="list-disc pr-6 space-y-1">
        <li>معلومات الاتصال (الاسم، البريد الإلكتروني، رقم الهاتف)</li>
        <li>وثائق التحقق من الهوية</li>
        <li>معلومات الدفع</li>
        <li>تفاصيل الحجز</li>
      </ul>

      <h4 className="font-semibold mt-4">2. كيف نستخدم معلوماتك</h4>
      <p>نستخدم المعلومات التي نجمعها من أجل:</p>
      <ul className="list-disc pr-6 space-y-1">
        <li>معالجة حجوزاتك</li>
        <li>التحقق من هويتك</li>
        <li>التواصل معك بشأن الخدمات</li>
        <li>تحسين منصتنا</li>
      </ul>

      <h4 className="font-semibold mt-4">3. أمان البيانات</h4>
      <p>نحن ننفذ تدابير أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به.</p>

      <h4 className="font-semibold mt-4">4. حقوقك</h4>
      <p>لديك الحق في الوصول إلى بياناتك الشخصية وتصحيحها وحذفها.</p>

      <h4 className="font-semibold mt-4">5. اتصل بنا</h4>
      <p>للأسئلة المتعلقة بهذه السياسة، اتصل بنا على: contact@motonita.ma</p>
    </div>
  ) : language === 'fr' ? (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-lg">Politique de Confidentialité - Motonita.ma</h3>
      <p>Dernière mise à jour : Décembre 2024</p>
      
      <h4 className="font-semibold mt-4">1. Informations que nous collectons</h4>
      <p>Nous collectons les informations personnelles que vous nous fournissez directement, notamment :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Coordonnées (nom, email, téléphone)</li>
        <li>Documents de vérification d'identité</li>
        <li>Informations de paiement</li>
        <li>Détails des réservations</li>
      </ul>

      <h4 className="font-semibold mt-4">2. Comment nous utilisons vos informations</h4>
      <p>Nous utilisons les informations collectées pour :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Traiter vos réservations</li>
        <li>Vérifier votre identité</li>
        <li>Communiquer avec vous concernant les services</li>
        <li>Améliorer notre plateforme</li>
      </ul>

      <h4 className="font-semibold mt-4">3. Sécurité des données</h4>
      <p>Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations personnelles.</p>

      <h4 className="font-semibold mt-4">4. Vos droits</h4>
      <p>Vous avez le droit d'accéder, corriger et supprimer vos données personnelles.</p>

      <h4 className="font-semibold mt-4">5. Contactez-nous</h4>
      <p>Pour toute question concernant cette politique, contactez-nous à : contact@motonita.ma</p>
    </div>
  ) : (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-lg">Privacy Policy - Motonita.ma</h3>
      <p>Last updated: December 2024</p>
      
      <h4 className="font-semibold mt-4">1. Information We Collect</h4>
      <p>We collect personal information that you provide to us directly, including:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Contact information (name, email, phone number)</li>
        <li>Identity verification documents</li>
        <li>Payment information</li>
        <li>Booking details</li>
      </ul>

      <h4 className="font-semibold mt-4">2. How We Use Your Information</h4>
      <p>We use the information we collect to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Process your bookings</li>
        <li>Verify your identity</li>
        <li>Communicate with you about services</li>
        <li>Improve our platform</li>
      </ul>

      <h4 className="font-semibold mt-4">3. Data Security</h4>
      <p>We implement appropriate security measures to protect your personal information from unauthorized access.</p>

      <h4 className="font-semibold mt-4">4. Your Rights</h4>
      <p>You have the right to access, correct, and delete your personal data.</p>

      <h4 className="font-semibold mt-4">5. Contact Us</h4>
      <p>For questions about this policy, contact us at: contact@motonita.ma</p>
    </div>
  );

  const termsContent = language === 'ar' ? (
    <div className="space-y-4 text-sm text-right" dir="rtl">
      <h3 className="font-semibold text-lg">شروط الخدمة - موتوري.ما</h3>
      <p>آخر تحديث: ديسمبر 2024</p>
      
      <h4 className="font-semibold mt-4">1. القبول</h4>
      <p>باستخدام موتوري.ما، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

      <h4 className="font-semibold mt-4">2. متطلبات الأهلية</h4>
      <ul className="list-disc pr-6 space-y-1">
        <li>يجب أن يكون عمرك 18 عامًا على الأقل</li>
        <li>يجب أن يكون لديك رخصة قيادة سارية</li>
        <li>يجب أن تكمل عملية التحقق من الهوية</li>
      </ul>

      <h4 className="font-semibold mt-4">3. شروط الإيجار</h4>
      <ul className="list-disc pr-6 space-y-1">
        <li>مبلغ التأمين: 700 درهم (قابل للاسترداد)</li>
        <li>يجب إعادة الدراجة بنفس الحالة</li>
        <li>المستأجر مسؤول عن أي أضرار</li>
      </ul>

      <h4 className="font-semibold mt-4">4. الإلغاء</h4>
      <p>الإلغاء مجاني حتى 24 ساعة قبل الاستلام. الإلغاء المتأخر قد يتحمل رسومًا.</p>

      <h4 className="font-semibold mt-4">5. المسؤولية</h4>
      <p>موتوري.ما غير مسؤول عن الحوادث أو الإصابات أثناء فترة الإيجار.</p>
    </div>
  ) : language === 'fr' ? (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-lg">Conditions d'Utilisation - Motonita.ma</h3>
      <p>Dernière mise à jour : Décembre 2024</p>
      
      <h4 className="font-semibold mt-4">1. Acceptation</h4>
      <p>En utilisant Motonita.ma, vous acceptez d'être lié par ces conditions générales.</p>

      <h4 className="font-semibold mt-4">2. Conditions d'éligibilité</h4>
      <ul className="list-disc pl-6 space-y-1">
        <li>Vous devez avoir au moins 18 ans</li>
        <li>Vous devez avoir un permis de conduire valide</li>
        <li>Vous devez compléter la vérification d'identité</li>
      </ul>

      <h4 className="font-semibold mt-4">3. Conditions de location</h4>
      <ul className="list-disc pl-6 space-y-1">
        <li>Caution : 700 DH (remboursable)</li>
        <li>Le véhicule doit être restitué en même état</li>
        <li>Le locataire est responsable de tout dommage</li>
      </ul>

      <h4 className="font-semibold mt-4">4. Annulation</h4>
      <p>Annulation gratuite jusqu'à 24h avant la prise en charge. Les annulations tardives peuvent entraîner des frais.</p>

      <h4 className="font-semibold mt-4">5. Responsabilité</h4>
      <p>Motonita.ma n'est pas responsable des accidents ou blessures pendant la période de location.</p>
    </div>
  ) : (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-lg">Terms of Service - Motonita.ma</h3>
      <p>Last updated: December 2024</p>
      
      <h4 className="font-semibold mt-4">1. Acceptance</h4>
      <p>By using Motonita.ma, you agree to be bound by these terms and conditions.</p>

      <h4 className="font-semibold mt-4">2. Eligibility Requirements</h4>
      <ul className="list-disc pl-6 space-y-1">
        <li>You must be at least 18 years old</li>
        <li>You must have a valid driver's license</li>
        <li>You must complete identity verification</li>
      </ul>

      <h4 className="font-semibold mt-4">3. Rental Terms</h4>
      <ul className="list-disc pl-6 space-y-1">
        <li>Security deposit: 700 DH (refundable)</li>
        <li>Vehicle must be returned in the same condition</li>
        <li>Renter is responsible for any damages</li>
      </ul>

      <h4 className="font-semibold mt-4">4. Cancellation</h4>
      <p>Free cancellation up to 24 hours before pickup. Late cancellations may incur fees.</p>

      <h4 className="font-semibold mt-4">5. Liability</h4>
      <p>Motonita.ma is not responsible for accidents or injuries during the rental period.</p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {type === "privacy" ? t('auth.privacyPolicy') : t('auth.termsOfService')}
          </DialogTitle>
          <DialogDescription>
            {type === "privacy" 
              ? "Please read our privacy policy carefully" 
              : "Please read our terms of service carefully"
            }
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[50vh] pr-4">
          {type === "privacy" ? privacyContent : termsContent}
        </ScrollArea>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={onAccept} className="flex-1">
            I Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PrivacyTermsModal.displayName = "PrivacyTermsModal";
