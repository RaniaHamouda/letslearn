
const LOG_PREFIX = "Let's Learn (V3.23 - User Comment Visibility Fix):";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, signInWithCustomToken,
    setPersistence, browserLocalPersistence, updateProfile,
    updatePassword, EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, doc, deleteDoc, getDoc, updateDoc,
    query, where, serverTimestamp, onSnapshot, setDoc, getDocs, limit,
    orderBy, runTransaction
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfigFromHTML = {
    apiKey: "AIzaSyCRMkbfRQkK8V_M3h3_Ghb4BkXviHxabJM",
  authDomain: "letslearn-64bd9.firebaseapp.com",
  projectId: "letslearn-64bd9",
  storageBucket: "letslearn-64bd9.firebasestorage.app",
  messagingSenderId: "660557039676",
  appId: "1:660557039676:web:b505c9614c8304484cdb39",
    measurementId: "G-EJGWFEKR0F"
};

const finalFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfigFromHTML;
let app, auth, db, analytics;
try {
    app = initializeApp(finalFirebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    console.info(`${LOG_PREFIX} Firebase Initialized. Project ID:`, finalFirebaseConfig.projectId);
} catch (error) {
    console.error(`${LOG_PREFIX} CRITICAL: Firebase Initialization Error:`, error);
    document.body.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 1.5rem; color: var(--accent-danger, #F56565); background: var(--bg-primary, #1A202C); height: 100vh; display: flex; flex-direction:column; align-items: center; justify-content: center; font-family: 'Changa', sans-serif;"><span>خطأ كارثي: فشل في تهيئة اتصال قاعدة البيانات.</span><span style="font-size:1rem; margin-top:10px;">الرجاء التأكد من صحة إعدادات Firebase.</span></div>`;
    throw new Error(`${LOG_PREFIX} Firebase initialization failed.`);
}

const globalAppId = typeof __app_id !== 'undefined' ? __app_id : finalFirebaseConfig.projectId;
if (!globalAppId) console.error(`${LOG_PREFIX} CRITICAL: Global App ID is undefined.`);

const coursesCollectionPath = `artifacts/${globalAppId}/public/data/courses`;
const usersCollectionPathRoot = `artifacts/${globalAppId}/users`;
const likesCollectionPath = (courseId) => `artifacts/${globalAppId}/public/data/courses/${courseId}/likes`;
const commentsCollectionPath = (courseId) => `artifacts/${globalAppId}/public/data/courses/${courseId}/comments`;

const coursesCollectionRef = collection(db, coursesCollectionPath);

let currentUser = null;
let currentCategory = 'الرئيسية';
let coursesPerPage = 10;
let allFetchedCoursesForCategory = {};
let displayedCoursesCount = 0;
let adminActionCallback = null;
const ADMIN_PASSWORD = "334411";
const SIGNUP_ACCESS_PASSWORD = "334411";
let unsubscribeCoursesListener = null;
let unsubscribeApprovedComments = null; 
let unsubscribeUserPendingComments = null; 
let unsubscribeAdminPendingComments = null; 

let currentLanguage = 'ar';
let selectedImageFileAdd = null;
let selectedImageFileEdit = null;
let selectedProfileImageFile = null;

const themeToggleButton = document.getElementById('theme-toggle');
const languageToggleButton = document.getElementById('language-toggle');
const sunIcon = themeToggleButton.querySelector('.fa-sun');
const moonIcon = themeToggleButton.querySelector('.fa-moon');
const authContainer = document.getElementById('auth-container');
const desktopMenuAuthItems = document.getElementById('desktop-menu-auth-items');
const mobileMenuAuthItems = document.getElementById('mobile-menu-auth-items');
const pages = document.querySelectorAll('.page');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const coursesGrid = document.getElementById('courses-grid');
const homeCategoriesGrid = document.getElementById('home-categories-grid');
const coursesTitleEl = document.getElementById('courses-title');
const loadMoreButton = document.getElementById('load-more-courses');
const loadMoreContainer = document.getElementById('load-more-container');
const addCourseButton = document.getElementById('add-course-button');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const addCourseModal = document.getElementById('addCourseModal');
const closeAddCourseModalButton = document.getElementById('closeAddCourseModal');
const addCourseForm = document.getElementById('add-course-form');
const courseSectionSelect = document.getElementById('course-section');
const courseImageUploadAddInput = document.getElementById('course-image-upload-add');
const courseImagePreviewAdd = document.getElementById('course-image-preview-add');
const editCourseModal = document.getElementById('editCourseModal');
const closeEditCourseModalButton = document.getElementById('closeEditCourseModal');
const editCourseForm = document.getElementById('edit-course-form');
const editCourseIdInput = document.getElementById('edit-course-id');
const editCourseExistingImageUrlInput = document.getElementById('edit-course-existing-image-url');
const editCourseNameInput = document.getElementById('edit-course-name');
const editCourseSectionSelect = document.getElementById('edit-course-section');
const editCourseLinkInput = document.getElementById('edit-course-link');
const courseImageUploadEditInput = document.getElementById('course-image-upload-edit');
const courseImagePreviewEdit = document.getElementById('course-image-preview-edit');
const removeCourseImageEditButton = document.getElementById('remove-course-image-edit');
const adminPasswordModal = document.getElementById('adminPasswordModal');
const closeAdminPasswordModalButton = document.getElementById('closeAdminPasswordModal');
const adminPasswordForm = document.getElementById('admin-password-form');
const signupPasswordModal = document.getElementById('signupPasswordModal');
const closeSignupPasswordModalButton = document.getElementById('closeSignupPasswordModal');
const signupPasswordForm = document.getElementById('signup-password-form');
const signupAdminVerifyModal = document.getElementById('signupAdminVerifyModal');
const closeSignupAdminVerifyModalButton = document.getElementById('closeSignupAdminVerifyModal');
const signupAdminVerifyForm = document.getElementById('signup-admin-verify-form');
const customAlertModal = document.getElementById('customAlertModal');
const customAlertTitleEl = document.getElementById('customAlertTitle');
const customAlertMessageEl = document.getElementById('customAlertMessage');
const customAlertOkButton = document.getElementById('customAlertOkButton');
const customAlertIconEl = document.getElementById('customAlertIcon');
const backButton = document.getElementById('back-button');
const backButtonIcon = backButton.querySelector('i');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
let tempSignupData = null;
const moreMenuContainer = document.getElementById('more-menu-container');
const moreMenuButton = document.getElementById('more-menu-button');
const moreMenuDropdown = document.getElementById('more-menu-dropdown');
const moreMenuIcon = moreMenuButton ? moreMenuButton.querySelector('i.fa-chevron-down') : null;
const profileForm = document.getElementById('profile-form');
const changePasswordForm = document.getElementById('change-password-form');
const profileImageUploadInput = document.getElementById('profile-image-upload');
const profileImagePreview = document.getElementById('profile-image-preview');
const commentsModal = document.getElementById('commentsModal');
const closeCommentsModalButton = document.getElementById('closeCommentsModal');
const commentsListContainer = document.getElementById('comments-list-container');
const addCommentForm = document.getElementById('add-comment-form');
const commentCourseIdInput = document.getElementById('comment-course-id');
const commentTextInput = document.getElementById('comment-text');
const editingCommentIdInput = document.getElementById('editing-comment-id');

const translations = {
    ar: {
        siteTitle: "Let's Learn | هيا نتعلم", logoText: "هيا نتعلم", navHome: "الرئيسية", navDataAnalysis: "تحليل البيانات",
        navAI: "الذكاء الاصطناعي", navProgramming: "البرمجة", navMore: "المزيد", navFrontend: "الواجهات الأمامية",
        navBackend: "الواجهات الخلفية", navInfoSecurity: "أمن المعلومات", navMobileDev: "تطبيقات الموبايل",
        navDataScience: "علوم البيانات", navCloudComputing: "الحوسبة السحابية", navIoT: "إنترنت الأشياء",
        navGameDev: "تطوير الألعاب", navDevOps: "DevOps", navBlockchain: "بلوكتشين", navRobotics: "الروبوتات",
        navAdvCybersecurity: "أمن سيبراني متقدم", navUIUX: "تصميم واجهات وتجربة المستخدم", navQuantumComputing: "الحوسبة الكمومية",
        navBioinformatics: "المعلوماتية الحيوية", navEthicalHacking: "الاختراق الأخلاقي", navFintech: "التكنولوجيا المالية",
        navXR: "الواقع الممتد (XR)", navDataEngineering: "هندسة البيانات", navDeepLearning: "التعلم العميق",
        navFullStack: "تطوير الويب الكامل", navCloudSolutionsArch: "هندسة الحلول السحابية", navRPA: "الأتمتة الروبوتية للعمليات",
        navProfile: "الملف الشخصي",
        navHomeMobile: "الرئيسية", navDataAnalysisMobile: "تحليل البيانات", navAIMobile: "الذكاء الاصطناعي",
        navProgrammingMobile: "البرمجة", navFrontendMobile: "الواجهات الأمامية", navBackendMobile: "الواجهات الخلفية",
        navInfoSecurityMobile: "أمن المعلومات", navMobileDevMobile: "تطبيقات الموبايل", navDataScienceMobile: "علوم البيانات",
        navCloudComputingMobile: "الحوسبة السحابية", navIoTMobile: "إنترنت الأشياء", navGameDevMobile: "تطوير الألعاب",
        navDevOpsMobile: "DevOps", navBlockchainMobile: "بلوكتشين", navRoboticsMobile: "الروبوتات",
        navAdvCybersecurityMobile: "أمن سيبراني متقدم", navUIUXMobile: "تصميم واجهات وتجربة المستخدم",
        navQuantumComputingMobile: "الحوسبة الكمومية", navBioinformaticsMobile: "المعلوماتية الحيوية",
        navEthicalHackingMobile: "الاختراق الأخلاقي", navFintechMobile: "التكنولوجيا المالية", navXRMobile: "الواقع الممتد (XR)",
        navDataEngineeringMobile: "هندسة البيانات", navDeepLearningMobile: "التعلم العميق", navFullStackMobile: "تطوير الويب الكامل",
        navCloudSolutionsArchMobile: "هندسة الحلول السحابية", navRPAMobile: "الأتمتة الروبوتية للعمليات",
        navProfileMobile: "الملف الشخصي",
        desktopNavLogin: "تسجيل الدخول", desktopNavSignup: "إنشاء حساب", mobileNavLogin: "تسجيل الدخول", mobileNavSignup: "إنشاء حساب",
        heroTitle: "استكشف آفاق <span style=\"color: var(--accent-primary);\">المستقبل الرقمي</span>",
        heroSubtitle: "Let's Learn: بوابتك نحو إتقان أحدث التقنيات والبرمجيات في عالم يتسارع نحو الغد.",
        catDataAnalysisTitle: "تحليل البيانات", catDataAnalysisDesc: "حوّل البيانات إلى رؤى استراتيجية تقود الابتكار.",
        catAITitle: "الذكاء الاصطناعي", catAIDesc: "اكتشف قوة الآلات الذكية وتطبيقاتها الثورية.",
        catProgrammingTitle: "البرمجة", catProgrammingDesc: "أتقن لغات المستقبل وابنِ حلولاً تغير قواعد اللعبة.",
        catFrontendTitle: "الواجهات الأمامية", catFrontendDesc: "صمم تجارب مستخدم غامرة وواجهات بصرية مذهلة.",
        catBackendTitle: "الواجهات الخلفية", catBackendDesc: "طور الأنظمة الخلفية القوية التي تشغل تطبيقات الغد.",
        catInfoSecTitle: "أمن المعلومات", catInfoSecDesc: "احمِ الفضاء الرقمي وكن خط الدفاع الأول.",
        catMobileDevTitle: "تطبيقات الموبايل", catMobileDevDesc: "ابنِ تطبيقات مبتكرة تصل لملايين المستخدمين.",
        catDataScienceTitle: "علوم البيانات", catDataScienceDesc: "استخرج كنوز المعرفة من البيانات الضخمة.",
        catCloudComputingTitle: "الحوسبة السحابية", catCloudComputingDesc: "استفد من قوة السحابة لتوسيع نطاق تطبيقاتك.",
        catIoTTitle: "إنترنت الأشياء", catIoTDesc: "صل العالم المادي بالرقمي عبر أجهزة ذكية.",
        catGameDevTitle: "تطوير الألعاب", catGameDevDesc: "حوّل أفكارك إلى عوالم افتراضية تفاعلية.",
        catDevOpsTitle: "DevOps", catDevOpsDesc: "سرّع عمليات التطوير والنشر بكفاءة وأمان.",
        catBlockchainTitle: "بلوكتشين", catBlockchainDesc: "اكتشف تقنية الثقة اللامركزية وتطبيقاتها.",
        catRoboticsTitle: "الروبوتات", catRoboticsDesc: "صمم وبرمج الروبوتات الذكية لمستقبل أتمتة.",
        catAdvCybersecTitle: "أمن سيبراني متقدم", catAdvCybersecDesc: "تعمق في استراتيجيات الدفاع والهجوم السيبراني.",
        catUIUXTitle: "تصميم واجهات وتجربة المستخدم", catUIUXDesc: "ابنِ تجارب مستخدم بديهية وجذابة بصرياً.",
        catQuantumTitle: "الحوسبة الكمومية", catQuantumDesc: "استكشف مستقبل المعالجة الفائقة وقدراتها.",
        catBioinfoTitle: "المعلوماتية الحيوية", catBioinfoDesc: "ادمج علوم الأحياء مع قوة تحليل البيانات.",
        catEthicalHackTitle: "الاختراق الأخلاقي", catEthicalHackDesc: "تعلم كيف تحمي الأنظمة بفهم ثغراتها.",
        catFintechTitle: "التكنولوجيا المالية", catFintechDesc: "ابتكر حلولاً مالية رقمية تغير الأسواق.",
        catXRTitle: "الواقع الممتد (XR)", catXRDesc: "صمم تجارب غامرة تدمج الواقع والخيال.",
        catDataEngTitle: "هندسة البيانات", catDataEngDesc: "ابنِ وصين خطوط أنابيب البيانات والبنى التحتية.",
        catDeepLearnTitle: "التعلم العميق", catDeepLearnDesc: "اكتشف الشبكات العصبية وتطبيقاتها المتقدمة.",
        catFullStackTitle: "تطوير الويب الكامل", catFullStackDesc: "أتقن تطوير الواجهات الأمامية والخلفية معًا.",
        catCloudSolArchTitle: "هندسة الحلول السحابية", catCloudSolArchDesc: "صمم ونفذ حلولاً سحابية قوية وقابلة للتوسع.",
        catRPATitle: "الأتمتة الروبوتية (RPA)", catRPADesc: "أتمتة العمليات التجارية باستخدام الروبوتات البرمجية.",
        exploreCategoryBase: "استكشف", addNewCourseBtn: "إضافة كورس جديد", loadMoreBtn: "تحميل المزيد",
        noCoursesFound: "لم يتم العثور على كورسات في هذا القسم.", noCoursesFoundAdminHint: "يمكنك إضافة كورس جديد!",
        loginTitle: "تسجيل الدخول", emailLabel: "البريد الإلكتروني", emailPlaceholder: "example@mail.com",
        passwordLabel: "كلمة المرور", passwordPlaceholder: "********", loginBtn: "دخول",
        noAccountPrompt: "ليس لديك حساب؟", createAccountLink: "إنشاء حساب جديد", signupTitle: "إنشاء حساب جديد",
        fullNameLabel: "الاسم الكامل", fullNamePlaceholder: "الاسم الأول واسم العائلة", dobLabel: "تاريخ الميلاد",
        confirmPasswordLabel: "تأكيد كلمة المرور", confirmPasswordPlaceholder: "********", accountTypeLabel: "نوع الحساب:",
        userRole: "مستخدم", adminRole: "مسؤول", signupBtn: "تسجيل", alreadyHaveAccountPrompt: "لديك حساب بالفعل؟",
        loginLink: "تسجيل الدخول", copyrightText: `© ${new Date().getFullYear()} Let's Learn. جميع الحقوق محفوظة.`,
        madeWithLoveTextStart: "صُنع بحب", madeWithLoveTextEnd: "", scrollToTopTitle: "العودة للأعلى",
        addCourseModalTitle: "إضافة كورس جديد", courseNameLabel: "اسم الكورس", courseNamePlaceholder: "مثال: مقدمة في بايثون",
        courseSectionLabel: "القسم", selectSectionOption: "-- اختر القسم --", courseLinkLabel: "رابط الكورس",
        courseLinkPlaceholderGeneric: "https://example.com/course-link",
        courseImageUploadLabel: "رفع صورة الكورس", courseImageOptionalLabel: "رابط صورة الكورس (اختياري)",
        courseImagePlaceholder: "https://example.com/image.jpg", addCourseBtnModal: "إضافة الكورس",
        editCourseModalTitle: "تعديل الكورس", saveChangesBtn: "حفظ التعديلات", removeImageBtn: "إزالة الصورة الحالية",
        adminVerifyTitle: "تحقق هوية المسؤول", controlPasswordLabel: "كلمة مرور التحكم", controlPasswordPlaceholder: "كلمة المرور السرية",
        confirmIdentityBtn: "تأكيد الهوية", confirmAdminAccountTitle: "تأكيد حساب المسؤول",
        enterControlPasswordAdminSignup: "أدخل كلمة مرور التحكم لإنشاء حساب مسؤول", verifyBtn: "تحقق",
        accessSignupVerificationTitle: "التحقق للوصول لإنشاء الحساب", accessPasswordLabel: "كلمة مرور الوصول",
        accessPasswordPlaceholder: "كلمة مرور الدخول للتسجيل", okButton: "مفهوم", courseWatchButton: "مشاهدة",
        authWelcomeBack: "مرحباً بعودتك!", authLoggedInSuccess: "تم تسجيل الدخول بنجاح.",
        authLogoutSuccess: "لقد تم تسجيل خروجك بنجاح.", authLogoutError: "حدث خطأ أثناء تسجيل الخروج:",
        authSignupSuccessTitle: "تم إنشاء الحساب!", authSignupSuccessMsg: "مرحباً! تم إنشاء حسابك بنجاح.",
        authSignupError: "فشل التسجيل", authLoginError: "فشل الدخول", authMissingInfo: "معلومات ناقصة",
        authMissingInfoMsg: "يرجى إدخال البريد الإلكتروني وكلمة المرور.", authPasswordsMismatch: "كلمات المرور غير متطابقة",
        authPasswordsMismatchMsg: "كلمات المرور التي أدخلتها غير متطابقة.", authWeakPassword: "كلمة مرور ضعيفة",
        authWeakPasswordMsg: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.", authAdminPasswordIncorrect: "كلمة مرور غير صحيحة",
        authAdminPasswordIncorrectMsg: "كلمة مرور التحكم التي أدخلتها غير صحيحة.",
        authSignupAccessPasswordIncorrectMsg: "كلمة المرور التي أدخلتها للوصول لصفحة التسجيل غير صحيحة.",
        authAccessDenied: "الوصول مرفوض", authAccessDeniedAdminAction: "ليس لديك صلاحيات لهذا الإجراء.",
        authAccessDeniedAddCourse: "ليس لديك صلاحيات لإضافة كورس.", authAccessDeniedDeleteCourse: "ليس لديك صلاحيات لحذف كورس.",
        authAccessDeniedEditCourse: "ليس لديك صلاحيات لتعديل هذا الكورس.",
        courseAddedSuccess: "تمت إضافة الكورس!", courseAddedSuccessMsg: "تم نشر الكورس الجديد بنجاح.",
        courseAddError: "خطأ في إضافة الكورس", courseAddErrorMsg: "فشل إضافة الكورس:",
        courseUpdatedSuccess: "تم تحديث الكورس!", courseUpdatedSuccessMsg: "تم حفظ تعديلات الكورس بنجاح.",
        courseUpdateError: "خطأ في تحديث الكورس", courseUpdateErrorMsg: "فشل تحديث الكورس:",
        confirmDeleteTitle: "تأكيد الحذف", confirmDeleteMsg: "هل أنت متأكد تماماً من رغبتك في حذف هذا الكورس؟ هذا الإجراء لا يمكن التراجع عنه.",
        confirmDeleteBtnYes: "نعم، احذف", confirmDeleteBtnCancel: "إلغاء", courseDeleteSuccess: "اكتمل الحذف",
        courseDeleteSuccessMsg: "تم حذف الكورس بنجاح.", courseDeleteError: "خطأ في الحذف", courseDeleteErrorMsg: "فشل حذف الكورس:",
        selectCategoryPrompt: "اختر قسماً لاستكشاف الكورسات.", errorLoadingCourses: "خطأ في تحميل الكورسات",
        errorLoadingCoursesConsole: "تحقق من الكونسول.", userDisplayNameFallback: "مستخدم",
        userRoleUser: "مستخدم", userRoleAdmin: "مسؤول",
        authLoginBtnNav: "دخول", authSignupBtnNav: "تسجيل", authLogoutBtn: "خروج",
        profilePageTitle: "الملف الشخصي", profileChangeImage: "تغيير الصورة", profileUpdateBtn: "تحديث الملف الشخصي",
        profileChangePasswordTitle: "تغيير كلمة المرور", profileCurrentPassword: "كلمة المرور الحالية",
        profileNewPassword: "كلمة المرور الجديدة", profileConfirmNewPassword: "تأكيد كلمة المرور الجديدة",
        profileUpdatePasswordBtn: "تحديث كلمة المرور", profileUserRoleLabel: "نوع الحساب", profileUserIdLabel: "معرف المستخدم (User ID)",
        profileUpdateSuccess: "تم تحديث الملف الشخصي!", profileUpdateSuccessMsg: "تم حفظ بيانات ملفك الشخصي بنجاح.",
        profileUpdateError: "خطأ في تحديث الملف", profileUpdateErrorMsg: "فشل تحديث بيانات الملف الشخصي:",
        passwordUpdateSuccess: "تم تحديث كلمة المرور!", passwordUpdateSuccessMsg: "تم تغيير كلمة المرور بنجاح.",
        passwordUpdateError: "خطأ في تحديث كلمة المرور", passwordUpdateErrorMsg: "فشل تغيير كلمة المرور:",
        reAuthRequired: "مطلوب إعادة المصادقة", reAuthRequiredMsg: "لتغيير كلمة المرور، يرجى إدخال كلمة المرور الحالية مرة أخرى.",
        imageUploadSizeError: "حجم الصورة كبير جداً. الرجاء اختيار صورة أصغر (بحد أقصى 500 كيلوبايت).",
        firebaseInvalidEmail: 'صيغة البريد الإلكتروني الذي أدخلته غير صحيحة.', firebaseUserDisabled: 'تم تعطيل حساب المستخدم هذا من قبل المسؤول.',
        firebaseUserNotFound: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.', firebaseWrongPassword: 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
        firebaseEmailInUse: 'هذا البريد الإلكتروني مسجل بالفعل. حاول تسجيل الدخول.', firebaseWeakPasswordAuth: 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.',
        firebaseDefaultError: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        invalidUrlError: "رابط غير صالح", invalidUrlErrorMsg: "يرجى تقديم رابط ويب صالح يبدأ بـ http:// أو https://",
        imageUploadFailed: "فشل رفع الصورة", imageUploadSuccess: "تم رفع الصورة بنجاح!", imageURLError: "خطأ في الحصول على رابط الصورة",
        imageUploading: "جاري رفع الصورة...", imageUploadingMsg: "يرجى الانتظار حتى يتم رفع الصورة.",
        commentsModalTitle: "التعليقات", addCommentLabel: "إضافة تعليق:", commentPlaceholder: "اكتب تعليقك هنا...",
        submitCommentBtn: "إرسال التعليق", editCommentBtn: "تعديل", deleteCommentBtn: "حذف",
        approveCommentBtn: "موافقة", replyCommentBtn: "رد",
        commentAddedSuccess: "تم إضافة التعليق!", commentAddedSuccessMsg: "تم إرسال تعليقك بنجاح.",
        commentAddedPendingApprovalMsg: "تم إرسال تعليقك وسوف يظهر بعد المراجعة.",
        commentAddError: "خطأ في إضافة التعليق", commentAddErrorMsg: "فشل إرسال التعليق:",
        commentUpdatedSuccess: "تم تحديث التعليق!", commentUpdatedSuccessMsg: "تم حفظ تعديلاتك على التعليق.",
        commentUpdateError: "خطأ في تحديث التعليق", commentUpdateErrorMsg: "فشل تحديث التعليق:",
        commentDeletedSuccess: "تم حذف التعليق!", commentDeletedSuccessMsg: "تم حذف التعليق بنجاح.",
        commentDeleteError: "خطأ في حذف التعليق", commentDeleteErrorMsg: "فشل حذف التعليق:",
        commentApprovedSuccess: "تمت الموافقة على التعليق!", commentApprovedSuccessMsg: "تم نشر التعليق.",
        commentApproveError: "خطأ في الموافقة", commentApproveErrorMsg: "فشل الموافقة على التعليق:",
        confirmCommentDeleteTitle: "تأكيد حذف التعليق", confirmCommentDeleteMsg: "هل أنت متأكد من رغبتك في حذف هذا التعليق؟",
        noCommentsYet: "لا توجد تعليقات حتى الآن. كن أول من يعلق!",
        adminReplyPlaceholder: "اكتب ردك هنا...", submitReplyBtn: "إرسال الرد",
        pendingApprovalText: "(في انتظار المراجعة)",
        likedCourse: "أعجبك هذا الكورس", unlikedCourse: "إزالة الإعجاب",
        likeError: "خطأ في الإعجاب", unlikeError: "خطأ في إزالة الإعجاب",
        commentsLoadError: "خطأ في تحميل التعليقات",
        loginToInteract: "يجب تسجيل الدخول للتفاعل.",
        loadingComments: "جاري تحميل التعليقات...",
    },
    en: {
        siteTitle: "Let's Learn", logoText: "Let's Learn", navHome: "Home", navDataAnalysis: "Data Analysis", navAI: "AI",
        navProgramming: "Programming", navMore: "More", navFrontend: "Front-end Dev", navBackend: "Back-end Dev",
        navInfoSecurity: "Info Security", navMobileDev: "Mobile Dev", navDataScience: "Data Science",
        navCloudComputing: "Cloud Computing", navIoT: "IoT", navGameDev: "Game Dev", navDevOps: "DevOps",
        navBlockchain: "Blockchain", navRobotics: "Robotics", navAdvCybersecurity: "Adv. Cybersecurity",
        navUIUX: "UI/UX Design", navQuantumComputing: "Quantum Computing", navBioinformatics: "Bioinformatics",
        navEthicalHacking: "Ethical Hacking", navFintech: "FinTech", navXR: "Extended Reality (XR)",
        navDataEngineering: "Data Engineering", navDeepLearning: "Deep Learning", navFullStack: "Full-Stack Dev",
        navCloudSolutionsArch: "Cloud Solutions Arch.", navRPA: "RPA", navProfile: "Profile",
        navHomeMobile: "Home", navDataAnalysisMobile: "Data Analysis", navAIMobile: "AI", navProgrammingMobile: "Programming",
        navFrontendMobile: "Front-end", navBackendMobile: "Back-end", navInfoSecurityMobile: "Info Security",
        navMobileDevMobile: "Mobile Dev", navDataScienceMobile: "Data Science", navCloudComputingMobile: "Cloud Computing",
        navIoTMobile: "IoT", navGameDevMobile: "Game Dev", navDevOpsMobile: "DevOps", navBlockchainMobile: "Blockchain",
        navRoboticsMobile: "Robotics", navAdvCybersecurityMobile: "Adv. Cybersecurity", navUIUXMobile: "UI/UX",
        navQuantumComputingMobile: "Quantum Computing", navBioinformaticsMobile: "Bioinformatics",
        navEthicalHackingMobile: "Ethical Hacking", navFintechMobile: "FinTech", navXRMobile: "XR",
        navDataEngineeringMobile: "Data Engineering", navDeepLearningMobile: "Deep Learning",
        navFullStackMobile: "Full-Stack Dev", navCloudSolutionsArchMobile: "Cloud Solutions Arch.", navRPAMobile: "RPA",
        navProfileMobile: "Profile",
        desktopNavLogin: "Login", desktopNavSignup: "Sign Up", mobileNavLogin: "Login", mobileNavSignup: "Sign Up",
        heroTitle: "Explore the Horizons of the <span style=\"color: var(--accent-primary);\">Digital Future</span>",
        heroSubtitle: "Let's Learn: Your gateway to mastering the latest technologies and software in a world accelerating towards tomorrow.",
        catDataAnalysisTitle: "Data Analysis", catDataAnalysisDesc: "Turn data into strategic insights that drive innovation.",
        catAITitle: "Artificial Intelligence", catAIDesc: "Discover the power of intelligent machines and their revolutionary applications.",
        catProgrammingTitle: "Programming", catProgrammingDesc: "Master the languages of the future and build game-changing solutions.",
        catFrontendTitle: "Front-end Development", catFrontendDesc: "Design immersive user experiences and stunning visual interfaces.",
        catBackendTitle: "Back-end Development", catBackendDesc: "Develop the robust backend systems that power tomorrow's applications.",
        catInfoSecTitle: "Information Security", catInfoSecDesc: "Protect the digital space and be the first line of defense.",
        catMobileDevTitle: "Mobile App Development", catMobileDevDesc: "Build innovative applications that reach millions of users.",
        catDataScienceTitle: "Data Science", catDataScienceDesc: "Extract knowledge treasures from big data.",
        catCloudComputingTitle: "Cloud Computing", catCloudComputingDesc: "Leverage the power of the cloud to scale your applications.",
        catIoTTitle: "Internet of Things", catIoTDesc: "Connect the physical and digital worlds through smart devices.",
        catGameDevTitle: "Game Development", catGameDevDesc: "Turn your ideas into interactive virtual worlds.",
        catDevOpsTitle: "DevOps", catDevOpsDesc: "Accelerate development and deployment processes efficiently and securely.",
        catBlockchainTitle: "Blockchain", catBlockchainDesc: "Discover decentralized trust technology and its applications.",
        catRoboticsTitle: "Robotics", catRoboticsDesc: "Design and program intelligent robots for an automated future.",
        catAdvCybersecTitle: "Advanced Cybersecurity", catAdvCybersecDesc: "Delve into cyber defense and offense strategies.",
        catUIUXTitle: "UI/UX Design", catUIUXDesc: "Build intuitive and visually appealing user experiences.",
        catQuantumTitle: "Quantum Computing", catQuantumDesc: "Explore the future of ultra-fast processing and its capabilities.",
        catBioinfoTitle: "Bioinformatics", catBioinfoDesc: "Integrate biological sciences with the power of data analysis.",
        catEthicalHackTitle: "Ethical Hacking", catEthicalHackDesc: "Learn how to protect systems by understanding their vulnerabilities.",
        catFintechTitle: "Financial Technology", catFintechDesc: "Innovate digital financial solutions that transform markets.",
        catXRTitle: "Extended Reality (XR)", catXRDesc: "Design immersive experiences that blend reality and imagination.",
        catDataEngTitle: "Data Engineering", catDataEngDesc: "Build and maintain data pipelines and infrastructures.",
        catDeepLearnTitle: "Deep Learning", catDeepLearnDesc: "Discover neural networks and their advanced applications.",
        catFullStackTitle: "Full-Stack Development", catFullStackDesc: "Master both front-end and back-end development.",
        catCloudSolArchTitle: "Cloud Solutions Architecture", catCloudSolArchDesc: "Design and implement robust and scalable cloud solutions.",
        catRPATitle: "Robotic Process Automation (RPA)", catRPADesc: "Automate business processes using software robots.",
        exploreCategoryBase: "Explore", addNewCourseBtn: "Add New Course", loadMoreBtn: "Load More",
        noCoursesFound: "No courses found in this section.", noCoursesFoundAdminHint: "You can add a new course!",
        loginTitle: "Login", emailLabel: "Email Address", emailPlaceholder: "example@mail.com", passwordLabel: "Password",
        passwordPlaceholder: "********", loginBtn: "Login", noAccountPrompt: "Don't have an account?",
        createAccountLink: "Create a new account", signupTitle: "Create New Account", fullNameLabel: "Full Name",
        fullNamePlaceholder: "First and Last Name", dobLabel: "Date of Birth", confirmPasswordLabel: "Confirm Password",
        confirmPasswordPlaceholder: "********", accountTypeLabel: "Account Type:", userRole: "User", adminRole: "Admin",
        signupBtn: "Sign Up", alreadyHaveAccountPrompt: "Already have an account?", loginLink: "Login",
        copyrightText: `© ${new Date().getFullYear()} Let's Learn. All rights reserved.`,
        madeWithLoveTextStart: "Made with love", madeWithLoveTextEnd: "", scrollToTopTitle: "Scroll to Top",
        addCourseModalTitle: "Add New Course", courseNameLabel: "Course Name", courseNamePlaceholder: "e.g., Introduction to Python",
        courseSectionLabel: "Section", selectSectionOption: "-- Select Section --", courseLinkLabel: "Course Link",
        courseLinkPlaceholderGeneric: "https://example.com/course-link",
        courseImageUploadLabel: "Upload Course Image", courseImageOptionalLabel: "Course Image URL (Optional)",
        courseImagePlaceholder: "https://example.com/image.jpg", addCourseBtnModal: "Add Course",
        editCourseModalTitle: "Edit Course", saveChangesBtn: "Save Changes", removeImageBtn: "Remove Current Image",
        adminVerifyTitle: "Admin Verification", controlPasswordLabel: "Control Password", controlPasswordPlaceholder: "Secret password",
        confirmIdentityBtn: "Confirm Identity", confirmAdminAccountTitle: "Confirm Admin Account",
        enterControlPasswordAdminSignup: "Enter control password to create an admin account", verifyBtn: "Verify",
        accessSignupVerificationTitle: "Access Verification for Signup", accessPasswordLabel: "Access Password",
        accessPasswordPlaceholder: "Signup access password", okButton: "OK", courseWatchButton: "Watch",
        authWelcomeBack: "Welcome back!", authLoggedInSuccess: "Successfully logged in.",
        authLogoutSuccess: "You have been successfully logged out.", authLogoutError: "Error logging out:",
        authSignupSuccessTitle: "Account Created!", authSignupSuccessMsg: "Welcome! Your account has been successfully created.",
        authSignupError: "Signup Failed", authLoginError: "Login Failed", authMissingInfo: "Missing Information",
        authMissingInfoMsg: "Please enter both email and password.", authPasswordsMismatch: "Passwords Mismatch",
        authPasswordsMismatchMsg: "The passwords you entered do not match.", authWeakPassword: "Weak Password",
        authWeakPasswordMsg: "Password should be at least 6 characters long.", authAdminPasswordIncorrect: "Incorrect Password",
        authAdminPasswordIncorrectMsg: "The control password you entered is incorrect.",
        authSignupAccessPasswordIncorrectMsg: "The password you entered to access the signup page is incorrect.",
        authAccessDenied: "Access Denied", authAccessDeniedAdminAction: "You do not have permission for this action.",
        authAccessDeniedAddCourse: "You do not have permission to add a course.", authAccessDeniedDeleteCourse: "You do not have permission to delete a course.",
        authAccessDeniedEditCourse: "You do not have permission to edit this course.",
        courseAddedSuccess: "Course Added!", courseAddedSuccessMsg: "The new course has been published successfully.",
        courseAddError: "Error Adding Course", courseAddErrorMsg: "Failed to add course:",
        courseUpdatedSuccess: "Course Updated!", courseUpdatedSuccessMsg: "Course changes saved successfully.",
        courseUpdateError: "Error Updating Course", courseUpdateErrorMsg: "Failed to update course:",
        confirmDeleteTitle: "Confirm Deletion", confirmDeleteMsg: "Are you absolutely sure you want to delete this course? This action cannot be undone.",
        confirmDeleteBtnYes: "Yes, delete", confirmDeleteBtnCancel: "Cancel", courseDeleteSuccess: "Deletion Complete",
        courseDeleteSuccessMsg: "The course has been successfully deleted.", courseDeleteError: "Error Deleting",
        courseDeleteErrorMsg: "Failed to delete course:", selectCategoryPrompt: "Select a category to explore courses.",
        errorLoadingCourses: "Error Loading Courses", errorLoadingCoursesConsole: "Check console.",
        userDisplayNameFallback: "User", userRoleUser: "User", userRoleAdmin: "Admin",
        authLoginBtnNav: "Login", authSignupBtnNav: "Sign Up", authLogoutBtn: "Logout",
        profilePageTitle: "Profile", profileChangeImage: "Change Image", profileUpdateBtn: "Update Profile",
        profileChangePasswordTitle: "Change Password", profileCurrentPassword: "Current Password",
        profileNewPassword: "New Password", profileConfirmNewPassword: "Confirm New Password",
        profileUpdatePasswordBtn: "Update Password", profileUserRoleLabel: "Account Type", profileUserIdLabel: "User ID",
        profileUpdateSuccess: "Profile Updated!", profileUpdateSuccessMsg: "Your profile data has been saved successfully.",
        profileUpdateError: "Profile Update Error", profileUpdateErrorMsg: "Failed to update profile data:",
        passwordUpdateSuccess: "Password Updated!", passwordUpdateSuccessMsg: "Your password has been changed successfully.",
        passwordUpdateError: "Password Update Error", passwordUpdateErrorMsg: "Failed to change password:",
        reAuthRequired: "Re-authentication Required", reAuthRequiredMsg: "To change your password, please enter your current password again.",
        imageUploadSizeError: "Image file is too large. Please choose a smaller image (max ~500KB).",
        firebaseInvalidEmail: 'The email address is badly formatted.', firebaseUserDisabled: 'This user account has been disabled by an administrator.',
        firebaseUserNotFound: 'There is no user record corresponding to this identifier.', firebaseWrongPassword: 'The password is invalid or the user does not have a password.',
        firebaseEmailInUse: 'The email address is already in use by another account.', firebaseWeakPasswordAuth: 'Password should be at least 6 characters.',
        firebaseDefaultError: 'An unexpected error occurred. Please try again.',
        invalidUrlError: "Invalid Link", invalidUrlErrorMsg: "Please provide a valid web link starting with http:// or https://",
        imageUploadFailed: "Image Upload Failed", imageUploadSuccess: "Image uploaded successfully!", imageURLError: "Error getting image URL",
        imageUploading: "Uploading Image...", imageUploadingMsg: "Please wait while the image is being uploaded.",
        commentsModalTitle: "Comments", addCommentLabel: "Add a comment:", commentPlaceholder: "Write your comment here...",
        submitCommentBtn: "Submit Comment", editCommentBtn: "Edit", deleteCommentBtn: "Delete",
        approveCommentBtn: "Approve", replyCommentBtn: "Reply",
        commentAddedSuccess: "Comment Added!", commentAddedSuccessMsg: "Your comment has been submitted successfully.",
        commentAddedPendingApprovalMsg: "Your comment has been submitted and will appear after review.",
        commentAddError: "Error Adding Comment", commentAddErrorMsg: "Failed to submit comment:",
        commentUpdatedSuccess: "Comment Updated!", commentUpdatedSuccessMsg: "Your comment changes have been saved.",
        commentUpdateError: "Error Updating Comment", commentUpdateErrorMsg: "Failed to update comment:",
        commentDeletedSuccess: "Comment Deleted!", commentDeletedSuccessMsg: "The comment has been deleted successfully.",
        commentDeleteError: "Error Deleting Comment", commentDeleteErrorMsg: "Failed to delete comment:",
        commentApprovedSuccess: "Comment Approved!", commentApprovedSuccessMsg: "The comment has been published.",
        commentApproveError: "Error Approving Comment", commentApproveErrorMsg: "Failed to approve comment:",
        confirmCommentDeleteTitle: "Confirm Comment Deletion", confirmCommentDeleteMsg: "Are you sure you want to delete this comment?",
        noCommentsYet: "No comments yet. Be the first to comment!",
        adminReplyPlaceholder: "Write your reply here...", submitReplyBtn: "Submit Reply",
        pendingApprovalText: "(Pending Approval)",
        likedCourse: "You liked this course", unlikedCourse: "Unlike this course",
        likeError: "Error liking course", unlikeError: "Error unliking course",
        commentsLoadError: "Error loading comments",
        loginToInteract: "You must be logged in to interact.",
        loadingComments: "Loading comments...",
    }
};
const categoryKeys = {
    "تحليل البيانات": "navDataAnalysis", "الذكاء الاصطناعي": "navAI", "البرمجة": "navProgramming",
    "تطوير الواجهات الأمامية": "navFrontend", "تطوير الواجهات الخلفية": "navBackend", "أمن المعلومات": "navInfoSecurity",
    "تطوير تطبيقات الموبايل": "navMobileDev", "علوم البيانات": "navDataScience", "الحوسبة السحابية": "navCloudComputing",
    "إنترنت الأشياء": "navIoT", "تطوير الألعاب": "navGameDev", "DevOps": "navDevOps", "بلوكتشين": "navBlockchain",
    "الروبوتات": "navRobotics", "أمن سيبراني متقدم": "navAdvCybersecurity", "تصميم واجهات وتجربة المستخدم": "navUIUX",
    "الحوسبة الكمومية": "navQuantumComputing", "المعلوماتية الحيوية": "navBioinformatics", "الاختراق الأخلاقي": "navEthicalHacking",
    "التكنولوجيا المالية": "navFintech", "الواقع الممتد (XR)": "navXR", "هندسة البيانات": "navDataEngineering",
    "التعلم العميق": "navDeepLearning", "تطوير الويب الكامل": "navFullStack", "هندسة الحلول السحابية": "navCloudSolutionsArch",
    "الأتمتة الروبوتية للعمليات": "navRPA"
};

function showCustomAlert(titleKey, messageKey, type = 'info', messageArgs = null) {
    const title = translations[currentLanguage][titleKey] || titleKey;
    let message = translations[currentLanguage][messageKey] || messageKey;
    if (messageArgs) {
        if (typeof messageArgs === 'string') message += ` ${messageArgs}`;
        else if (typeof messageArgs === 'object' && messageArgs.code) message += ` (${messageArgs.code} - ${messageArgs.message || ''})`;
        else if (typeof messageArgs === 'object') message += ` ${JSON.stringify(messageArgs)}`;
    }
    customAlertTitleEl.textContent = title; customAlertMessageEl.textContent = message; customAlertIconEl.innerHTML = '';
    const iconColors = { info: 'var(--accent-primary)', success: 'var(--accent-secondary)', error: 'var(--accent-danger)', warning: '#DD6B20' };
    const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', error: 'fas fa-times-circle', warning: 'fas fa-exclamation-triangle' };
    customAlertIconEl.innerHTML = `<i class="${icons[type]}" style="color: ${iconColors[type]};"></i>`;
    customAlertModal.style.display = 'flex';
}
customAlertOkButton.onclick = () => customAlertModal.style.display = 'none';

[addCourseModal, editCourseModal, adminPasswordModal, signupPasswordModal, customAlertModal, signupAdminVerifyModal, commentsModal].forEach(modal => {
    if (modal) {
        modal.onclick = (event) => { if (event.target === modal) modal.style.display = "none"; };
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.style.display === 'flex') modal.style.display = 'none'; });
    }
});
if (closeAddCourseModalButton) closeAddCourseModalButton.onclick = () => { addCourseModal.style.display = "none"; selectedImageFileAdd = null; courseImagePreviewAdd.src = "#"; courseImagePreviewAdd.classList.remove('active'); addCourseForm.reset(); };
if (closeEditCourseModalButton) closeEditCourseModalButton.onclick = () => { editCourseModal.style.display = "none"; selectedImageFileEdit = null; courseImagePreviewEdit.src = "#"; courseImagePreviewEdit.classList.remove('active'); removeCourseImageEditButton.classList.add('hidden'); editCourseForm.reset(); };
if (closeAdminPasswordModalButton) closeAdminPasswordModalButton.onclick = () => { adminPasswordModal.style.display = "none"; adminPasswordForm.reset(); };
if (closeSignupPasswordModalButton) closeSignupPasswordModalButton.onclick = () => { signupPasswordModal.style.display = "none"; signupPasswordForm.reset(); };
if (closeSignupAdminVerifyModalButton) closeSignupAdminVerifyModalButton.onclick = () => { signupAdminVerifyModal.style.display = "none"; signupAdminVerifyForm.reset(); };
if (closeCommentsModalButton) closeCommentsModalButton.onclick = () => {
    commentsModal.style.display = "none";
    if (unsubscribeApprovedComments) unsubscribeApprovedComments();
    if (unsubscribeUserPendingComments) unsubscribeUserPendingComments();
    if (unsubscribeAdminPendingComments) unsubscribeAdminPendingComments();
    unsubscribeApprovedComments = null;
    unsubscribeUserPendingComments = null;
    unsubscribeAdminPendingComments = null;
    addCommentForm.reset();
    editingCommentIdInput.value = '';
};

function updateTextContent() {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            if (key === 'heroTitle' || key.startsWith('cat') && key.endsWith('Desc')) { el.innerHTML = translations[currentLanguage][key]; }
            else { el.textContent = translations[currentLanguage][key]; }
        }
    });
    document.querySelectorAll('[data-translate-placeholder-key]').forEach(el => {
        const key = el.dataset.translatePlaceholderKey;
        if (translations[currentLanguage] && translations[currentLanguage][key]) { el.placeholder = translations[currentLanguage][key]; }
    });
    document.querySelectorAll('[data-translate-title-key]').forEach(el => {
        const key = el.dataset.translateTitleKey;
        if (translations[currentLanguage] && translations[currentLanguage][key]) { el.title = translations[currentLanguage][key]; }
    });
    document.querySelectorAll('a[data-page="courses"][data-category]').forEach(link => {
        const categoryAr = link.dataset.category; const categoryKey = categoryKeys[categoryAr];
        if (categoryKey && translations[currentLanguage][categoryKey]) {
            if (!link.classList.contains('nav-dropdown-item') && !link.classList.contains('block')) {
                if (link.parentElement.id === 'desktop-navigation' || link.parentElement === mobileMenu) { link.childNodes[0].nodeValue = translations[currentLanguage][categoryKey]; }
            } else if (link.classList.contains('nav-dropdown-item') || link.classList.contains('block')) { link.textContent = translations[currentLanguage][categoryKey]; }
        }
    });

    const selectsToUpdate = [courseSectionSelect, editCourseSectionSelect];
    selectsToUpdate.forEach(selectEl => {
        if (selectEl) {
            Array.from(selectEl.options).forEach(option => {
                if (option.value && categoryKeys[option.value]) { option.textContent = translations[currentLanguage][categoryKeys[option.value]] || option.value; }
                else if (option.value === "") { option.textContent = translations[currentLanguage]['selectSectionOption'] || "-- Select Section --"; }
            });
        }
    });
    if (document.getElementById('page-courses').classList.contains('active') && coursesTitleEl) {
        const baseText = translations[currentLanguage]['exploreCategoryBase'] || (currentLanguage === 'ar' ? 'استكشف' : 'Explore');
        const categoryKey = categoryKeys[currentCategory];
        const translatedCategory = categoryKey ? translations[currentLanguage][categoryKey] : currentCategory;
        coursesTitleEl.innerHTML = `${baseText} <span style="color: var(--accent-primary);">${translatedCategory}</span>`;
    }
    if (document.getElementById('page-home').classList.contains('active')) {
        renderHomeCategories();
    }
    if (document.getElementById('page-courses').classList.contains('active') && allFetchedCoursesForCategory[currentCategory]) {
        const coursesToReRender = allFetchedCoursesForCategory[currentCategory].slice(0, displayedCoursesCount);
        displayRenderedCourses(coursesToReRender, false);
    }
}

function setLanguage(lang) {
    currentLanguage = lang; document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    languageToggleButton.querySelector('span').textContent = lang === 'ar' ? 'EN' : 'ع';
    languageToggleButton.title = lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية';
    if (lang === 'ar') { scrollToTopBtn.style.left = '25px'; scrollToTopBtn.style.right = 'auto'; if (backButtonIcon) backButtonIcon.className = 'fas fa-arrow-right'; }
    else { scrollToTopBtn.style.left = 'auto'; scrollToTopBtn.style.right = '25px'; if (backButtonIcon) backButtonIcon.className = 'fas fa-arrow-left'; }
    updateTextContent();
    updateAuthUI(currentUser);
    populateCourseSectionSelects();
    localStorage.setItem('preferredLanguage', lang);
}
languageToggleButton.addEventListener('click', () => { const newLang = currentLanguage === 'ar' ? 'en' : 'ar'; setLanguage(newLang); });

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.classList.remove('dark'); if (sunIcon) sunIcon.classList.remove('hidden'); if (moonIcon) moonIcon.classList.add('hidden');
        root.style.setProperty('--bg-primary-rgb-val', '255,255,255'); root.style.setProperty('--bg-secondary-rgb-val', '247,250,252');
    } else {
        root.classList.add('dark'); if (sunIcon) sunIcon.classList.add('hidden'); if (moonIcon) moonIcon.classList.remove('hidden');
        root.style.setProperty('--bg-primary-rgb-val', '26,32,44'); root.style.setProperty('--bg-secondary-rgb-val', '45,55,72');
    }
    if (window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS) {
        const pJS = window.pJSDom[0].pJS; const newParticleColor = theme === 'light' ? '#E2E8F0' : '#4A5568'; const newLineColor = theme === 'light' ? '#EDF2F7' : '#2D3748';
        pJS.particles.color.value = newParticleColor; pJS.particles.line_linked.color = newLineColor; pJS.fn.particlesRefresh();
    }
}
themeToggleButton.addEventListener('click', () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark'); const newTheme = isCurrentlyDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme); applyTheme(newTheme);
});

function applyCategoryCardAccentColors() {
    document.querySelectorAll('.category-card-home').forEach(card => {
        const accentColor = card.dataset.accentColor;
        if (accentColor) {
            card.querySelector('.icon-wrapper').style.color = accentColor;
            card.addEventListener('mouseenter', () => card.style.borderColor = accentColor);
            card.addEventListener('mouseleave', () => card.style.borderColor = 'var(--border-color)');
        }
    });
}
function updateActiveNavLink(targetPageId, targetCategory) {
    document.querySelectorAll('.nav-link-item, .nav-dropdown-item').forEach(link => {
        link.classList.remove('active'); const page = link.dataset.page; const category = link.dataset.category;
        if (link.id === 'logo' && targetPageId === 'home') { link.classList.add('active'); }
        else if (page === targetPageId && (page !== 'courses' || category === targetCategory)) { link.classList.add('active'); }
    });
    if (moreMenuDropdown && moreMenuDropdown.querySelector('.nav-dropdown-item.active')) { if (moreMenuButton) moreMenuButton.classList.add('active'); }
    else if (moreMenuButton) { moreMenuButton.classList.remove('active'); }
}

function showSignupPasswordPrompt() {
    if (signupPasswordModal) {
        signupPasswordModal.style.display = 'flex';
        if (signupPasswordForm) { signupPasswordForm['signup-access-password'].value = ''; signupPasswordForm['signup-access-password'].focus(); }
    }
}
if (signupPasswordForm) {
    signupPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault(); const enteredPassword = signupPasswordForm['signup-access-password'].value;
        if (enteredPassword === SIGNUP_ACCESS_PASSWORD) { signupPasswordModal.style.display = 'none'; window.location.hash = 'signup'; }
        else { showCustomAlert("authAdminPasswordIncorrect", "authSignupAccessPasswordIncorrectMsg", 'error'); signupPasswordForm['signup-access-password'].value = ''; }
    });
}
document.addEventListener('click', function (e) {
    const link = e.target.closest('.nav-link-item, .nav-dropdown-item');
    if (link && link.dataset.page) {
        e.preventDefault();
        if (link.dataset.page === 'signup' && link.id !== 'show-signup') { showSignupPasswordPrompt(); return; }
        if (link.id === 'show-signup') { showSignupPasswordPrompt(); return; }

        let targetHash = `${link.dataset.page}`;
        if (link.dataset.category) { targetHash += `&category=${encodeURIComponent(link.dataset.category)}`; }
        if (window.location.hash !== `#${targetHash}`) { window.location.hash = targetHash; }
        else { showPageUI(link.dataset.page, link.dataset.category); }
        if (moreMenuDropdown && moreMenuDropdown.classList.contains('open') && moreMenuDropdown.contains(link)) {
            moreMenuDropdown.classList.remove('open'); if (moreMenuIcon) moreMenuIcon.classList.remove('rotate-180');
        }
    }
});

if (backButton) { backButton.addEventListener('click', (e) => { e.preventDefault(); history.back(); }); }

function showPageUI(pageId, category = null) {
    console.info(`${LOG_PREFIX} Navigating to page: ${pageId}, category: ${category || 'N/A'}`);
    pages.forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.querySelectorAll('.scroll-reveal, .home-category-reveal, .course-item-reveal').forEach((el, index) => {
            el.classList.remove('is-visible'); el.style.transitionDelay = `${index * 0.03}s`; scrollObserver.observe(el);
        });
    } else { console.error(`${LOG_PREFIX} Page 'page-${pageId}' not found. Defaulting to home.`); window.location.hash = 'home'; return; }
    updateActiveNavLink(pageId, category);
    if (backButton) {
        if (pageId === 'home' || pageId === 'login' || pageId === 'signup' || pageId === 'profile') { backButton.style.display = 'none'; }
        else { backButton.style.display = 'inline-flex'; }
    }

    if (pageId === 'courses' && category) {
        const categoryKey = categoryKeys[category];
        const translatedCategoryName = categoryKey ? (translations[currentLanguage][categoryKey] || category) : category;
        const baseText = translations[currentLanguage]['exploreCategoryBase'] || (currentLanguage === 'ar' ? 'استكشف' : 'Explore');
        coursesTitleEl.innerHTML = `${baseText} <span style="color: var(--accent-primary);">${translatedCategoryName}</span>`;
        currentCategory = category;
        resetAndFetchCoursesRealtime(currentCategory);
    } else if (pageId === 'home') {
        currentCategory = translations[currentLanguage]['navHome'] || 'الرئيسية';
        renderHomeCategories();
        applyCategoryCardAccentColors();
        if (unsubscribeCoursesListener) { unsubscribeCoursesListener(); unsubscribeCoursesListener = null; }
    } else if (pageId === 'login' || pageId === 'signup') {
        if (loginForm && pageId === 'login') loginForm.reset(); if (signupForm && pageId === 'signup') signupForm.reset();
    } else if (pageId === 'profile') {
        if (!currentUser) { window.location.hash = 'login'; return; }
        populateProfilePage();
    }
    mobileMenu.classList.add('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function route() {
    let hash = window.location.hash.substring(1);
    if (!hash) { hash = 'home'; if (window.location.hash === '') { history.replaceState(null, '', '#home'); } }
    const parts = hash.split('&category=');
    const pageId = parts[0]; const category = parts[1] ? decodeURIComponent(parts[1]) : null;
    console.log(`${LOG_PREFIX} Routing to pageId: ${pageId}, category: ${category}`);
    showPageUI(pageId, category);
}
mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
if (moreMenuButton && moreMenuDropdown && moreMenuIcon) {
    moreMenuButton.addEventListener('click', (event) => { event.stopPropagation(); moreMenuDropdown.classList.toggle('open'); moreMenuIcon.classList.toggle('rotate-180'); });
    window.addEventListener('click', (event) => {
        if (moreMenuDropdown.classList.contains('open') && moreMenuContainer && !moreMenuContainer.contains(event.target)) {
            moreMenuDropdown.classList.remove('open'); moreMenuIcon.classList.remove('rotate-180');
        }
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && moreMenuDropdown.classList.contains('open')) { moreMenuDropdown.classList.remove('open'); moreMenuIcon.classList.remove('rotate-180'); } });
}

async function initAuth() {
    console.log(`${LOG_PREFIX} initAuth called`);
    if (!auth) { console.error(`${LOG_PREFIX} Auth service not available for initAuth.`); return; }
    try { await setPersistence(auth, browserLocalPersistence); if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } }
    catch (error) { console.error(`${LOG_PREFIX} Error during initial auth setup:`, error); }

    onAuthStateChanged(auth, async user => {
        console.log(`${LOG_PREFIX} onAuthStateChanged triggered. User UID:`, user ? user.uid : 'null');
        if (user) {
            const userDocRef = doc(db, usersCollectionPathRoot, user.uid);
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    currentUser = { uid: user.uid, displayName: user.displayName, email: user.email, role: userData.role || 'user', photoURL: userData.photoURL, dateOfBirth: userData.dateOfBirth };
                } else {
                    const roleToSet = tempSignupData ? tempSignupData.role : 'user';
                    const displayNameToSet = tempSignupData ? tempSignupData.name : user.displayName;
                    const dobToSet = tempSignupData ? tempSignupData.dob : null;
                    currentUser = { uid: user.uid, displayName: displayNameToSet, email: user.email, role: roleToSet, photoURL: null, dateOfBirth: dobToSet };
                    if (!tempSignupData) {
                        await setDoc(userDocRef, { uid: user.uid, email: user.email, displayName: displayNameToSet, dateOfBirth: dobToSet, role: roleToSet, createdAt: serverTimestamp(), photoURL: null });
                    }
                }
            } catch (error) {
                console.error(`${LOG_PREFIX} Error fetching/creating user document:`, error);
                currentUser = { uid: user.uid, displayName: user.displayName, email: user.email, role: 'user', photoURL: null, dateOfBirth: null };
            }
        } else {
            currentUser = null;
        }
        console.log(`${LOG_PREFIX} currentUser updated:`, currentUser);
        updateAuthUI(currentUser);
        route();
    });
}

function updateAuthUI(userWithRoleAndData) {
    console.log(`${LOG_PREFIX} updateAuthUI called. User:`, userWithRoleAndData ? userWithRoleAndData.uid : 'null');
    const loginBtnText = translations[currentLanguage]['authLoginBtnNav'] || 'Login';
    const signupBtnText = translations[currentLanguage]['authSignupBtnNav'] || 'Sign Up';
    const logoutBtnText = translations[currentLanguage]['authLogoutBtn'] || 'Logout';
    const profileBtnText = translations[currentLanguage]['navProfile'] || 'Profile';

    let desktopAuthHTML = '';
    let mobileAuthHTML = '';

    if (userWithRoleAndData) {
        const displayName = userWithRoleAndData.displayName || userWithRoleAndData.email || (translations[currentLanguage]['userDisplayNameFallback'] || 'User');
        authContainer.innerHTML = `<span class="text-xs sm:text-sm me-1.5 sm:me-2 hidden lg:inline text-app-paragraph">${displayName}</span> <button id="logout-button" class="btn btn-danger !px-2 !sm:px-2.5 !py-1 !sm:py-1.5 !text-2xs !sm:text-xs">${logoutBtnText}</button>`;
        document.getElementById('logout-button').addEventListener('click', async () => {
            try { await signOut(auth); showCustomAlert("authLogoutSuccess", "authLogoutSuccess", "success"); window.location.hash = 'home'; }
            catch (error) { showCustomAlert("authLogoutError", "authLogoutError", 'error', error.message); }
        });

        desktopAuthHTML = `<a href="#" class="nav-link-item" data-page="profile">${profileBtnText}</a>`;
        mobileAuthHTML = `<a href="#" class="block nav-link-item text-center py-3 border-b border-app-default" data-page="profile">${translations[currentLanguage]['navProfileMobile'] || profileBtnText}</a>`;

        if (addCourseButton) { addCourseButton.style.display = (userWithRoleAndData.role === 'admin') ? 'inline-flex' : 'none'; }
    } else {
        authContainer.innerHTML = `<button class="btn btn-primary !px-1.5 !sm:px-2 !py-0.5 !sm:py-1 !text-3xs !sm:text-xs nav-link-item" data-page="login">${loginBtnText}</button> <button id="nav-signup-button" class="btn btn-secondary !px-1.5 !sm:px-2 !py-0.5 !sm:py-1 !text-3xs !sm:text-xs ms-1 sm:ms-1.5 nav-link-item" data-page="signup">${signupBtnText}</button>`;
        desktopAuthHTML = `<a href="#" class="nav-link-item" data-page="login">${translations[currentLanguage]['desktopNavLogin']}</a> <a href="#" class="nav-link-item !text-[var(--accent-secondary)]" data-page="signup">${translations[currentLanguage]['desktopNavSignup']}</a>`;
        mobileAuthHTML = `<a href="#" class="block nav-link-item text-center py-3 border-b border-app-default" data-page="login">${translations[currentLanguage]['mobileNavLogin']}</a> <a href="#" class="block nav-link-item text-center py-3 !text-[var(--accent-secondary)]" data-page="signup">${translations[currentLanguage]['mobileNavSignup']}</a>`;
        if (addCourseButton) addCourseButton.style.display = 'none';
    }

    if (desktopMenuAuthItems) desktopMenuAuthItems.innerHTML = desktopAuthHTML;
    if (mobileMenuAuthItems) mobileMenuAuthItems.innerHTML = mobileAuthHTML;
}


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const email = loginForm['login-email'].value; const password = loginForm['login-password'].value;
    if (!email || !password) { showCustomAlert("authMissingInfo", "authMissingInfoMsg", 'warning'); return; }
    try { await signInWithEmailAndPassword(auth, email, password); showCustomAlert("authWelcomeBack", "authLoggedInSuccess", 'success'); window.location.hash = 'home'; loginForm.reset(); }
    catch (error) { showCustomAlert("authLoginError", getFirebaseErrorMessage(error), 'error'); }
});
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const name = signupForm['signup-name'].value.trim(); const dob = signupForm['signup-dob'].value;
    const email = signupForm['signup-email'].value.trim(); const password = signupForm['signup-password'].value;
    const confirmPassword = signupForm['signup-confirm-password'].value; const role = signupForm.elements['signup-role'].value;
    if (!name || !dob || !email || !password || !confirmPassword) { showCustomAlert("authMissingInfo", "authMissingInfoMsg", 'warning'); return; }
    if (password !== confirmPassword) { showCustomAlert("authPasswordsMismatch", "authPasswordsMismatchMsg", 'error'); return; }
    if (password.length < 6) { showCustomAlert("authWeakPassword", "authWeakPasswordMsg", 'warning'); return; }
    tempSignupData = { name, dob, email, password, role };
    if (role === 'admin') {
        signupAdminVerifyModal.style.display = 'flex';
        signupAdminVerifyForm['signup-admin-verify-password'].value = ''; signupAdminVerifyForm['signup-admin-verify-password'].focus();
    } else { await completeSignup(); }
});
signupAdminVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const enteredPassword = signupAdminVerifyForm['signup-admin-verify-password'].value;
    if (enteredPassword === ADMIN_PASSWORD) { signupAdminVerifyModal.style.display = 'none'; await completeSignup(); }
    else { showCustomAlert("authAdminPasswordIncorrect", "authAdminPasswordIncorrectMsg", 'error'); signupAdminVerifyForm['signup-admin-verify-password'].value = ''; }
});
async function completeSignup() {
    if (!tempSignupData) { showCustomAlert("authSignupError", "An unexpected error occurred during signup processing.", 'error'); return; }
    const { name, dob, email, password, role } = tempSignupData;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password); const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        const userDocRef = doc(db, usersCollectionPathRoot, user.uid);
        await setDoc(userDocRef, { uid: user.uid, email: user.email, displayName: name, dateOfBirth: dob, role: role, createdAt: serverTimestamp(), photoURL: null });
        showCustomAlert("authSignupSuccessTitle", "authSignupSuccessMsg", 'success'); window.location.hash = 'home'; signupForm.reset();
    } catch (error) { showCustomAlert("authSignupError", getFirebaseErrorMessage(error), 'error'); }
    finally { tempSignupData = null; }
}
function getFirebaseErrorMessage(error) {
    console.warn(`${LOG_PREFIX} Firebase Auth Error Details:`, error.code, error.message); const lang = currentLanguage || 'ar';
    switch (error.code) {
        case 'auth/invalid-email': return translations[lang]['firebaseInvalidEmail']; case 'auth/user-disabled': return translations[lang]['firebaseUserDisabled'];
        case 'auth/user-not-found': return translations[lang]['firebaseUserNotFound']; case 'auth/wrong-password': return translations[lang]['firebaseWrongPassword'];
        case 'auth/email-already-in-use': return translations[lang]['firebaseEmailInUse']; case 'auth/weak-password': return translations[lang]['firebaseWeakPasswordAuth'];
        default: return `${translations[lang]['firebaseDefaultError']} (${error.code || 'UNKNOWN_ERROR'})`;
    }
}

function isValidHttpUrl(string) {
    let url;
    try { url = new URL(string); }
    catch (_) { return false; }
    return url.protocol === "http:" || url.protocol === "https:";
}

function promptAdminPasswordForAction(callback) {
    adminActionCallback = callback; adminPasswordModal.style.display = 'flex';
    adminPasswordForm['admin-password'].value = ''; adminPasswordForm['admin-password'].focus();
}
adminPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminPasswordForm['admin-password'].value === ADMIN_PASSWORD) {
        adminPasswordModal.style.display = 'none'; if (adminActionCallback) adminActionCallback(); adminActionCallback = null;
    } else { showCustomAlert("authAccessDenied", "authAdminPasswordIncorrectMsg", 'error'); adminPasswordForm['admin-password'].value = ''; }
});

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

courseImageUploadAddInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        selectedImageFileAdd = file;
        const reader = new FileReader();
        reader.onload = function (e) {
            courseImagePreviewAdd.src = e.target.result;
            courseImagePreviewAdd.classList.add('active');
        }
        reader.readAsDataURL(file);
    } else {
        selectedImageFileAdd = null;
        courseImagePreviewAdd.src = "#";
        courseImagePreviewAdd.classList.remove('active');
    }
});
addCourseButton.addEventListener('click', () => {
    if (!currentUser || currentUser.role !== 'admin') { showCustomAlert("authAccessDenied", "authAccessDeniedAddCourse", 'warning'); return; }
    addCourseForm.reset();
    selectedImageFileAdd = null;
    courseImagePreviewAdd.src = "#";
    courseImagePreviewAdd.classList.remove('active');
    if (currentCategory && currentCategory !== (translations[currentLanguage]['navHome'])) { addCourseForm['course-section'].value = currentCategory; }
    else { addCourseForm['course-section'].value = ""; }
    addCourseModal.style.display = 'flex';
});
addCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') { showCustomAlert("authAccessDenied", "authAccessDeniedAddCourse", 'error'); return; }
    const courseName = addCourseForm['course-name'].value.trim();
    const courseSection = addCourseForm['course-section'].value;
    const courseLink = addCourseForm['course-link'].value.trim();

    if (!courseName || !courseSection || !courseLink) { showCustomAlert("authMissingInfo", "Please fill all required fields: Name, Section, and Link.", 'warning'); return; }
    if (!isValidHttpUrl(courseLink)) { showCustomAlert("invalidUrlError", "invalidUrlErrorMsg", 'warning'); return; }

    let imageUrl = `https://placehold.co/600x340/${getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim().substring(1).replace("#","")}/${getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim().substring(1).replace("#","")}?text=${encodeURIComponent(courseName)}&font=changa`;

    if (selectedImageFileAdd) {
        try {
            showCustomAlert("imageUploading", "imageUploadingMsg", 'info');
            imageUrl = await convertImageToBase64(selectedImageFileAdd);
            if (imageUrl.length > 700000) {
                showCustomAlert("imageUploadFailed", "imageUploadSizeError", 'error');
                return;
            }
        } catch (error) {
            showCustomAlert("imageUploadFailed", "Failed to process image.", 'error');
            return;
        }
    }

    const courseData = {
        nameAr: courseName, sectionAr: courseSection, youtubeLink: courseLink,
        imageUrl: imageUrl,
        timestamp: serverTimestamp(), addedBy: currentUser.uid,
        likeCount: 0, commentCount: 0
    };
    try {
        await addDoc(coursesCollectionRef, courseData);
        showCustomAlert("courseAddedSuccess", "courseAddedSuccessMsg", 'success');
        addCourseModal.style.display = 'none';
    }
    catch (error) { showCustomAlert("courseAddError", "courseAddErrorMsg", 'error', error.message); }
});

courseImageUploadEditInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        selectedImageFileEdit = file;
        const reader = new FileReader();
        reader.onload = function (e) {
            courseImagePreviewEdit.src = e.target.result;
            courseImagePreviewEdit.classList.add('active');
            removeCourseImageEditButton.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});
removeCourseImageEditButton.addEventListener('click', () => {
    selectedImageFileEdit = null;
    courseImagePreviewEdit.src = `https://placehold.co/600x340/ccc/999?text=${translations[currentLanguage]['courseImageOptionalLabel'] || 'Optional Image'}`;
    courseImagePreviewEdit.classList.add('active');
    editCourseExistingImageUrlInput.value = "REMOVED";
    removeCourseImageEditButton.classList.add('hidden');
    courseImageUploadEditInput.value = "";
});

async function openEditCourseModal(courseId) {
    try {
        const courseRef = doc(db, coursesCollectionPath, courseId); const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            editCourseIdInput.value = courseId;
            editCourseNameInput.value = courseData.nameAr || '';
            editCourseSectionSelect.value = courseData.sectionAr || '';
            editCourseLinkInput.value = courseData.youtubeLink || '';
            editCourseExistingImageUrlInput.value = courseData.imageUrl || '';

            if (courseData.imageUrl && (courseData.imageUrl.startsWith('data:image') || courseData.imageUrl.startsWith('http'))) {
                courseImagePreviewEdit.src = courseData.imageUrl;
                courseImagePreviewEdit.classList.add('active');
                removeCourseImageEditButton.classList.remove('hidden');
            } else {
                courseImagePreviewEdit.src = `https://placehold.co/600x340/ccc/999?text=${translations[currentLanguage]['courseImageOptionalLabel'] || 'Optional Image'}`;
                courseImagePreviewEdit.classList.add('active');
                removeCourseImageEditButton.classList.add('hidden');
            }
            selectedImageFileEdit = null;
            courseImageUploadEditInput.value = "";
            editCourseModal.style.display = 'flex';
        } else { showCustomAlert("courseUpdateError", "Course not found for editing.", 'error'); }
    } catch (error) { showCustomAlert("courseUpdateError", "courseUpdateErrorMsg", 'error', error.message); }
}
editCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') { showCustomAlert("authAccessDenied", "authAccessDeniedEditCourse", 'error'); return; }
    const courseId = editCourseIdInput.value; const courseName = editCourseNameInput.value.trim();
    const courseSection = editCourseSectionSelect.value; const courseLink = editCourseLinkInput.value.trim();

    if (!courseId || !courseName || !courseSection || !courseLink) { showCustomAlert("authMissingInfo", "Please fill all required fields: Name, Section, and Link.", 'warning'); return; }
    if (!isValidHttpUrl(courseLink)) { showCustomAlert("invalidUrlError", "invalidUrlErrorMsg", 'warning'); return; }

    let newImageUrl = editCourseExistingImageUrlInput.value;

    if (selectedImageFileEdit) {
        try {
            showCustomAlert("imageUploading", "imageUploadingMsg", 'info');
            newImageUrl = await convertImageToBase64(selectedImageFileEdit);
            if (newImageUrl.length > 700000) {
                showCustomAlert("imageUploadFailed", "imageUploadSizeError", 'error');
                return;
            }
        } catch (uploadError) {
            showCustomAlert("imageUploadFailed", "Failed to process image for update.", 'error');
            return;
        }
    } else if (editCourseExistingImageUrlInput.value === "REMOVED") {
        newImageUrl = `https://placehold.co/600x340/${getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim().substring(1).replace("#","")}/${getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim().substring(1).replace("#","")}?text=${encodeURIComponent(courseName)}&font=changa`;
    }

    const updatedData = {
        nameAr: courseName, sectionAr: courseSection, youtubeLink: courseLink,
        imageUrl: newImageUrl,
    };
    try {
        const courseRef = doc(db, coursesCollectionPath, courseId); await updateDoc(courseRef, updatedData);
        showCustomAlert("courseUpdatedSuccess", "courseUpdatedSuccessMsg", 'success');
        editCourseModal.style.display = 'none';
    } catch (error) { showCustomAlert("courseUpdateError", "courseUpdateErrorMsg", 'error', error.message); }
});

async function deleteCourse(courseId) {
    if (!currentUser || currentUser.role !== 'admin') { showCustomAlert("authAccessDenied", "authAccessDeniedDeleteCourse", 'warning'); return; }
    const confirmModalId = 'confirmDeleteCourseModalV3_21'; let confirmDeleteModal = document.getElementById(confirmModalId);
    if (confirmDeleteModal) confirmDeleteModal.remove();
    confirmDeleteModal = document.createElement('div'); confirmDeleteModal.className = 'modal items-center justify-center'; confirmDeleteModal.id = confirmModalId;
    confirmDeleteModal.innerHTML = `
        <div class="modal-content text-center max-w-md p-6 sm:p-8 bg-app-card rounded-lg shadow-lg relative border border-[var(--accent-danger)]">
            <span class="close-button absolute top-3 left-3" onclick="document.getElementById('${confirmModalId}').remove()">×</span>
            <div class="mb-4 sm:mb-5 text-4xl sm:text-5xl" style="color: var(--accent-danger);"><i class="fas fa-exclamation-triangle"></i></div>
            <h3 class="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-app-heading" data-translate-key="confirmDeleteTitle">${translations[currentLanguage]['confirmDeleteTitle']}</h3>
            <p class="mb-5 sm:mb-6 text-sm sm:text-base text-app-paragraph" data-translate-key="confirmDeleteMsg">${translations[currentLanguage]['confirmDeleteMsg']}</p>
            <div class="flex justify-center space-x-3 rtl:space-x-reverse">
                <button id="confirmDeleteBtnActualV3_21" class="btn btn-danger px-5 py-2 text-sm" data-translate-key="confirmDeleteBtnYes">${translations[currentLanguage]['confirmDeleteBtnYes']}</button>
                <button id="cancelDeleteBtnActualV3_21" class="btn btn-primary px-5 py-2 text-sm" style="background-color: var(--bg-tertiary); border-color: var(--bg-tertiary); color: var(--text-primary); opacity:0.8;" data-translate-key="confirmDeleteBtnCancel">${translations[currentLanguage]['confirmDeleteBtnCancel']}</button>
            </div></div>`;
    document.body.appendChild(confirmDeleteModal); confirmDeleteModal.style.display = 'flex';
    document.getElementById('confirmDeleteBtnActualV3_21').onclick = () => {
        confirmDeleteModal.remove();
        promptAdminPasswordForAction(async () => {
            try { await deleteDoc(doc(db, coursesCollectionPath, courseId)); showCustomAlert("courseDeleteSuccess", "courseDeleteSuccessMsg", 'success'); }
            catch (error) { showCustomAlert("courseDeleteError", "courseDeleteErrorMsg", 'error', error.message); }
        });
    };
    document.getElementById('cancelDeleteBtnActualV3_21').onclick = () => confirmDeleteModal.remove();
}

function populateProfilePage() {
    if (!currentUser) return;
    console.log(`${LOG_PREFIX} Populating profile page for user:`, currentUser.uid);
    const profileNameInput = document.getElementById('profile-name');
    const profileEmailInput = document.getElementById('profile-email');
    const profileDobInput = document.getElementById('profile-dob');
    const profileRoleDisplay = document.getElementById('profile-user-role');
    const profileUserIdDisplay = document.getElementById('profile-user-id');

    if (profileNameInput) profileNameInput.value = currentUser.displayName || '';
    if (profileEmailInput) profileEmailInput.value = currentUser.email || '';
    if (profileDobInput) profileDobInput.value = currentUser.dateOfBirth || '';

    if (profileImagePreview) {
         profileImagePreview.src = currentUser.photoURL || `https://placehold.co/120x120/${getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim().substring(1).replace("#","")}/${getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim().substring(1).replace("#","")}?text=${(currentUser.displayName || 'U').charAt(0).toUpperCase()}&font=changa`;
    }

    if (profileRoleDisplay) {
        const roleKey = currentUser.role === 'admin' ? 'adminRole' : 'userRole';
        profileRoleDisplay.textContent = translations[currentLanguage][roleKey] || currentUser.role;
    }
    if(profileUserIdDisplay) profileUserIdDisplay.textContent = currentUser.uid;

    if (changePasswordForm) changePasswordForm.reset();
    selectedProfileImageFile = null;
    if(profileImageUploadInput) profileImageUploadInput.value = "";
}

if (profileImageUploadInput) {
    profileImageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedProfileImageFile = file;
            convertImageToBase64(file).then(base64Image => {
                if (base64Image.length > 700000) {
                   showCustomAlert("imageUploadFailed", "imageUploadSizeError", 'error');
                   selectedProfileImageFile = null;
                   profileImageUploadInput.value = "";
                   return;
                }
                if (profileImagePreview) profileImagePreview.src = base64Image;
            }).catch(err => {
                showCustomAlert("imageUploadFailed", "Failed to process image.", 'error');
                selectedProfileImageFile = null;
                profileImageUploadInput.value = "";
            });
        }
    });
}

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const newName = document.getElementById('profile-name').value.trim();
        const newDob = document.getElementById('profile-dob').value;
        let newPhotoURL = currentUser.photoURL;

        if (selectedProfileImageFile) {
            try {
                const base64Image = await convertImageToBase64(selectedProfileImageFile);
                if (base64Image.length > 700000) {
                   showCustomAlert("imageUploadFailed", "imageUploadSizeError", 'error');
                   return;
                }
                newPhotoURL = base64Image;
            } catch (error) {
                showCustomAlert("imageUploadFailed", "Failed to process new profile image.", 'error');
                return;
            }
        }

        try {
            await updateProfile(auth.currentUser, { displayName: newName });
            const userDocRef = doc(db, usersCollectionPathRoot, currentUser.uid);
            await updateDoc(userDocRef, {
                displayName: newName,
                dateOfBirth: newDob,
                photoURL: newPhotoURL,
                updatedAt: serverTimestamp()
            });
            currentUser.displayName = newName;
            currentUser.dateOfBirth = newDob;
            currentUser.photoURL = newPhotoURL;
            selectedProfileImageFile = null;
            if(profileImageUploadInput) profileImageUploadInput.value = "";

            showCustomAlert("profileUpdateSuccess", "profileUpdateSuccessMsg", 'success');
            updateAuthUI(currentUser);
        } catch (error) {
            console.error("Profile update error:", error);
            showCustomAlert("profileUpdateError", "profileUpdateErrorMsg", 'error', error.message);
        }
    });
}

if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showCustomAlert("authMissingInfo", "Please fill all password fields.", 'warning');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showCustomAlert("authPasswordsMismatch", "authPasswordsMismatchMsg", 'error');
            return;
        }
        if (newPassword.length < 6) {
            showCustomAlert("authWeakPassword", "authWeakPasswordMsg", 'warning');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            showCustomAlert("passwordUpdateSuccess", "passwordUpdateSuccessMsg", 'success');
            changePasswordForm.reset();
        } catch (error) {
            console.error("Password update error:", error);
            if (error.code === 'auth/wrong-password') {
                showCustomAlert("passwordUpdateError", "firebaseWrongPassword", 'error');
            } else if (error.code === 'auth/requires-recent-login') {
                 showCustomAlert("passwordUpdateError", "reAuthRequiredMsg", 'error');
            }
            else {
                showCustomAlert("passwordUpdateError", "passwordUpdateErrorMsg", 'error', error.message);
            }
        }
    });
}

async function renderCourseCard(course) {
    const card = document.createElement('div'); card.id = `course-${course.id}`;
    card.className = 'course-card group course-item-reveal';
    const accentPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim().substring(1).replace("#","");
    const textPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim().substring(1).replace("#","");
    const placeholderImage = `https://placehold.co/600x340/${accentPrimaryColor}/${textPrimaryColor}?text=${encodeURIComponent(course.nameAr || 'Course')}&font=changa`;
    let adminButtonsHTML = '';
    if (currentUser && currentUser.role === 'admin') {
        adminButtonsHTML = `
            <button data-id="${course.id}" class="edit-course-button admin-action-button btn-icon text-md"> <i class="fas fa-edit"></i> </button>
            <button data-id="${course.id}" class="delete-course-button admin-action-button btn-icon text-md"> <i class="fas fa-trash-alt"></i> </button>`;
    }
    const courseNameDisplay = course.nameAr; const sectionKey = categoryKeys[course.sectionAr];
    const sectionDisplay = sectionKey ? (translations[currentLanguage][sectionKey] || course.sectionAr) : course.sectionAr;
    const watchButtonText = translations[currentLanguage]['courseWatchButton'] || 'Watch';
    const imageSource = (course.imageUrl && (course.imageUrl.startsWith('data:image') || course.imageUrl.startsWith('http'))) ? course.imageUrl : placeholderImage;

    let likeCount = course.likeCount || 0;
    let userHasLiked = false;
    if (currentUser) {
        const likeDocRef = doc(db, likesCollectionPath(course.id), currentUser.uid);
        try {
            const likeDocSnap = await getDoc(likeDocRef);
            userHasLiked = likeDocSnap.exists();
        } catch (err) { console.warn(`${LOG_PREFIX} Error fetching like status for course ${course.id}:`, err); }
    }
    const heartIconClass = userHasLiked ? 'fas fa-heart' : 'far fa-heart';
    const likeButtonTitle = userHasLiked ? translations[currentLanguage].unlikedCourse : translations[currentLanguage].likedCourse;

    card.innerHTML = `
        <div class="course-image-wrapper group">
            <img src="${imageSource}" alt="[Course Image: ${courseNameDisplay}]" onerror="this.onerror=null;this.src='${placeholderImage}';">
            <a href="${course.youtubeLink}" target="_blank" rel="noopener noreferrer" class="course-image-overlay"> <i class="fas fa-play-circle play-icon"></i> </a>
        </div>
        <div class="course-content">
            <span class="category-badge">${sectionDisplay}</span> <h3 title="${courseNameDisplay}">${courseNameDisplay}</h3>
            <div class="actions-footer">
                <div class="course-interactions">
                    <button class="interaction-btn like-course-btn ${userHasLiked ? 'liked' : ''}" data-course-id="${course.id}" title="${likeButtonTitle}">
                        <i class="${heartIconClass}"></i>
                        <span class="interaction-count like-count">${likeCount}</span>
                    </button>
                    <button class="interaction-btn open-comments-btn" data-course-id="${course.id}" title="${translations[currentLanguage].commentsModalTitle || 'Comments'}">
                        <i class="far fa-comment"></i>
                        <span class="interaction-count comment-count">${course.commentCount || 0}</span>
                    </button>
                </div>
                <div class="flex items-center">
                    <a href="${course.youtubeLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary text-sm px-3 py-1.5 flex items-center"> <i class="fab fa-youtube me-1.5 text-md"></i> ${watchButtonText} </a>
                    ${adminButtonsHTML}
                </div>
            </div>
        </div>`;

    if (currentUser && currentUser.role === 'admin') {
        const deleteButton = card.querySelector('.delete-course-button');
        if (deleteButton) deleteButton.addEventListener('click', (e) => { e.stopPropagation(); deleteCourse(course.id); });
        const editButton = card.querySelector('.edit-course-button');
        if (editButton) editButton.addEventListener('click', (e) => { e.stopPropagation(); promptAdminPasswordForAction(() => openEditCourseModal(course.id)); });
    }

    const likeButton = card.querySelector('.like-course-btn');
    if (likeButton) {
        likeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!currentUser) { showCustomAlert("authLoginError", translations[currentLanguage].loginToInteract || "You must be logged in to like a course.", "warning"); return; }
            await toggleLike(course.id, likeButton);
        });
    }
    const commentsButton = card.querySelector('.open-comments-btn');
    if (commentsButton) {
        commentsButton.addEventListener('click', (e) => {
            e.stopPropagation();
             if (!currentUser) { showCustomAlert("authLoginError", translations[currentLanguage].loginToInteract || "You must be logged in to view or add comments.", "warning"); return; }
            openCommentsModal(course.id, course.nameAr);
        });
    }
    return card;
}

async function displayRenderedCourses(courses, append = false) {
    console.log(`${LOG_PREFIX} displayRenderedCourses called. Appending: ${append}. Course count: ${courses.length}`);
    if (!append) { coursesGrid.innerHTML = ''; }
    const noCoursesText = translations[currentLanguage]['noCoursesFound'] || "No courses found.";
    const adminHintText = (currentUser && currentUser.role === 'admin') ? (translations[currentLanguage]['noCoursesFoundAdminHint'] || "You can add a new course!") : '';

    if (courses.length === 0 && !append && currentCategory !== (translations[currentLanguage]['navHome'])) {
        coursesGrid.innerHTML = `<p class="col-span-full text-center text-app-subheading py-12 text-lg">${noCoursesText} ${adminHintText}</p>`;
    } else {
        for (const course of courses) {
            const cardElement = await renderCourseCard(course);
            const delayIndex = append ? (coursesGrid.children.length) : coursesGrid.children.length;
            cardElement.style.transitionDelay = `${delayIndex * 0.03}s`;
            coursesGrid.appendChild(cardElement);
            scrollObserver.observe(cardElement);
        }
    }
    const totalCoursesInCurrentCategory = allFetchedCoursesForCategory[currentCategory] ? allFetchedCoursesForCategory[currentCategory].length : 0;
    displayedCoursesCount = coursesGrid.querySelectorAll('.course-card').length;
    if (displayedCoursesCount < totalCoursesInCurrentCategory) { loadMoreContainer.style.display = 'block'; }
    else { loadMoreContainer.style.display = 'none'; }
}

function showSkeletons(count) {
    coursesGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div'); skeleton.className = 'skeleton-card animate-fadeInUpStagger';
        skeleton.style.animationDelay = `${i * 0.03}s`;
        skeleton.innerHTML = `
            <div class="skeleton-img"></div> <div class="skeleton-line w-3/4"></div> <div class="skeleton-line w-1/2"></div>
            <div class="skeleton-line w-full mt-3"></div>
            <div class="flex justify-between items-center pt-4 border-t border-app-default mt-4">
                <div class="h-8 bg-[var(--bg-tertiary)] rounded-md w-2/5"></div> <div class="h-8 w-8 bg-[var(--bg-tertiary)] rounded-full"></div>
            </div>`;
        coursesGrid.appendChild(skeleton);
    }
    loadMoreContainer.style.display = 'none';
}
function resetAndFetchCoursesRealtime(categoryToFetch) {
    console.info(`${LOG_PREFIX} Attempting to fetch courses for category: "${categoryToFetch}"`);
    const homeCategoryTextKey = 'navHome';
    const homeCategoryText = translations[currentLanguage][homeCategoryTextKey] || 'الرئيسية';
    const selectCategoryPromptText = translations[currentLanguage]['selectCategoryPrompt'] || 'Select a category...';

    if (!categoryToFetch || categoryToFetch === homeCategoryText) {
        console.log(`${LOG_PREFIX} Category is home or invalid, clearing course grid.`);
        coursesGrid.innerHTML = `<p class="col-span-full text-center text-app-subheading py-12 text-lg">${selectCategoryPromptText}</p>`;
        loadMoreContainer.style.display = 'none';
        if (unsubscribeCoursesListener) {
            console.log(`${LOG_PREFIX} Unsubscribing from previous courses listener (home/invalid category).`);
            unsubscribeCoursesListener();
            unsubscribeCoursesListener = null;
        }
        return;
    }
    allFetchedCoursesForCategory[categoryToFetch] = []; displayedCoursesCount = 0; coursesGrid.innerHTML = '';
    showSkeletons(coursesPerPage);
    if (unsubscribeCoursesListener) {
        console.log(`${LOG_PREFIX} Unsubscribing from previous courses listener before new fetch.`);
        unsubscribeCoursesListener();
        unsubscribeCoursesListener = null;
    }
    const q = query(coursesCollectionRef, where("sectionAr", "==", categoryToFetch), orderBy("timestamp", "desc"));
    console.log(`${LOG_PREFIX} Firestore query for category "${categoryToFetch}":`, q);

    unsubscribeCoursesListener = onSnapshot(q, (querySnapshot) => {
        console.log(`${LOG_PREFIX} Firestore snapshot received for "${categoryToFetch}". Docs count: ${querySnapshot.docs.length}`);
        allFetchedCoursesForCategory[categoryToFetch] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const firstPageCourses = allFetchedCoursesForCategory[categoryToFetch].slice(0, coursesPerPage);
        displayRenderedCourses(firstPageCourses, false);
    }, (error) => {
        console.error(`${LOG_PREFIX} Firestore Snapshot Error for "${categoryToFetch}": `, error);
        const errorText = translations[currentLanguage]['errorLoadingCourses'] || 'Error loading courses';
        const consoleHint = translations[currentLanguage]['errorLoadingCoursesConsole'] || 'Check console.';
        coursesGrid.innerHTML = `<p class="col-span-full text-center text-[var(--accent-danger)] py-12 text-lg">${errorText} (${error.code}). ${consoleHint}</p>`;
        loadMoreContainer.style.display = 'none';
    });
    console.log(`${LOG_PREFIX} Subscribed to courses listener for "${categoryToFetch}".`);
}
loadMoreButton.addEventListener('click', () => {
    if (!allFetchedCoursesForCategory[currentCategory]) return;
    const currentLoadedCount = displayedCoursesCount; const totalInCategory = allFetchedCoursesForCategory[currentCategory].length;
    if (currentLoadedCount < totalInCategory) {
        const nextCoursesToShow = allFetchedCoursesForCategory[currentCategory].slice(currentLoadedCount, currentLoadedCount + coursesPerPage);
        displayRenderedCourses(nextCoursesToShow, true);
    } else { loadMoreContainer.style.display = 'none'; }
});

async function toggleLike(courseId, likeButtonElement) {
    if (!currentUser) return;
    const courseDocRef = doc(db, coursesCollectionPath, courseId);
    const likeDocRef = doc(db, likesCollectionPath(courseId), currentUser.uid);
    const likeIcon = likeButtonElement.querySelector('i');
    const likeCountSpan = likeButtonElement.querySelector('.like-count');
    let userCurrentlyLikes = likeButtonElement.classList.contains('liked');

    try {
        await runTransaction(db, async (transaction) => {
            const courseSnap = await transaction.get(courseDocRef);
            if (!courseSnap.exists()) { throw "Course not found!"; }
            const currentLikeCount = courseSnap.data().likeCount || 0;
            if (userCurrentlyLikes) {
                transaction.delete(likeDocRef);
                transaction.update(courseDocRef, { likeCount: Math.max(0, currentLikeCount - 1) });
            } else {
                transaction.set(likeDocRef, { likedAt: serverTimestamp(), userId: currentUser.uid });
                transaction.update(courseDocRef, { likeCount: currentLikeCount + 1 });
            }
        });
        userCurrentlyLikes = !userCurrentlyLikes;
        likeButtonElement.classList.toggle('liked', userCurrentlyLikes);
        likeIcon.className = userCurrentlyLikes ? 'fas fa-heart' : 'far fa-heart';
        likeButtonElement.title = userCurrentlyLikes ? translations[currentLanguage].unlikedCourse : translations[currentLanguage].likedCourse;
        const updatedCourseSnap = await getDoc(courseDocRef);
        if (updatedCourseSnap.exists()) {
            const newLikeCount = updatedCourseSnap.data().likeCount || 0;
            likeCountSpan.textContent = newLikeCount;
             if (allFetchedCoursesForCategory[currentCategory]) {
                const courseIndex = allFetchedCoursesForCategory[currentCategory].findIndex(c => c.id === courseId);
                if (courseIndex > -1) {
                    allFetchedCoursesForCategory[currentCategory][courseIndex].likeCount = newLikeCount;
                }
            }
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} Error toggling like for course ${courseId}:`, error);
        showCustomAlert("likeError", "Failed to update like status.", "error", error);
    }
}


async function openCommentsModal(courseId, courseName) {
    console.log(`${LOG_PREFIX} Opening comments modal for course ${courseId}`);
    if (unsubscribeApprovedComments) unsubscribeApprovedComments();
    if (unsubscribeUserPendingComments) unsubscribeUserPendingComments();
    if (unsubscribeAdminPendingComments) unsubscribeAdminPendingComments();

    commentsModal.style.display = 'flex';
    const modalTitle = commentsModal.querySelector('h3');
    modalTitle.textContent = `${translations[currentLanguage].commentsModalTitle || 'Comments'} - ${courseName}`;
    commentCourseIdInput.value = courseId;
    addCommentForm.reset();
    editingCommentIdInput.value = '';
    commentTextInput.placeholder = translations[currentLanguage].commentPlaceholder || "Write your comment here...";
    addCommentForm.querySelector('button[type="submit"] span').textContent = translations[currentLanguage].submitCommentBtn || "Submit Comment";
    commentsListContainer.innerHTML = `<p class="text-center text-app-subheading py-4">${translations[currentLanguage].loadingComments || 'Loading comments...'}</p>`;

    let displayedComments = {}; 

    function processAndRenderComments() {
        const allCommentsArray = Object.values(displayedComments);
        allCommentsArray.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        commentsListContainer.innerHTML = ''; 
        if (allCommentsArray.length === 0) {
            commentsListContainer.innerHTML = `<p class="text-center text-app-subheading py-4">${translations[currentLanguage].noCommentsYet || 'No comments yet.'}</p>`;
            return;
        }
        allCommentsArray.forEach(comment => renderCommentItem(comment, courseId));
    }

    
    const approvedQuery = query(collection(db, commentsCollectionPath(courseId)), where("approved", "==", true), orderBy("timestamp", "desc"));
    unsubscribeApprovedComments = onSnapshot(approvedQuery, (snapshot) => {
        console.log(`${LOG_PREFIX} Approved comments snapshot received for course ${courseId}. Docs: ${snapshot.docs.length}`);
        snapshot.forEach(docSnap => {
            displayedComments[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
        });
        processAndRenderComments();
    }, (error) => {
        console.error(`${LOG_PREFIX} Error loading approved comments for course ${courseId}:`, error);
        commentsListContainer.innerHTML = `<p class="text-center text-red-500 py-4">${translations[currentLanguage].commentsLoadError || 'Error loading comments.'}</p>`;
    });

    
    if (currentUser && currentUser.uid) {
        const userPendingQuery = query(collection(db, commentsCollectionPath(courseId)),
            where("authorId", "==", currentUser.uid),
            where("approved", "==", false),
            orderBy("timestamp", "desc"));
        unsubscribeUserPendingComments = onSnapshot(userPendingQuery, (snapshot) => {
            console.log(`${LOG_PREFIX} User's pending comments snapshot for course ${courseId}. Docs: ${snapshot.docs.length}`);
            snapshot.forEach(docSnap => {
                displayedComments[docSnap.id] = { id: docSnap.id, ...docSnap.data() }; 
            });
            processAndRenderComments();
        }, (error) => {
            console.error(`${LOG_PREFIX} Error loading user's pending comments for course ${courseId}:`, error);
            
        });

        
        if (currentUser.role === 'admin') {
            const adminPendingQuery = query(collection(db, commentsCollectionPath(courseId)),
                where("approved", "==", false), 
                
                orderBy("timestamp", "desc"));
            unsubscribeAdminPendingComments = onSnapshot(adminPendingQuery, (snapshot) => {
                console.log(`${LOG_PREFIX} Admin: All pending comments snapshot for course ${courseId}. Docs: ${snapshot.docs.length}`);
                snapshot.forEach(docSnap => {
                    displayedComments[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
                });
                processAndRenderComments();
            }, (error) => {
                console.error(`${LOG_PREFIX} Admin: Error loading all pending comments for course ${courseId}:`, error);
            });
        }
    }
}


function renderCommentItem(comment, courseId) {
    const item = document.createElement('div');
    item.className = `comment-item`;
    if (!comment.approved && currentUser && (currentUser.role === 'admin' || currentUser.uid === comment.authorId)) {
         item.classList.add('pending-approval');
    }
    item.id = `comment-${comment.id}`;

    const authorName = comment.authorName || "Anonymous";
    const authorRoleText = comment.authorRole === 'admin' ? `<span class="author-role">${translations[currentLanguage].adminRole}</span>` : '';
    const date = comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US') : 'N/A';

    let actionsHTML = '';
    if (currentUser) {
        if (currentUser.uid === comment.authorId) {
            actionsHTML += `<button class="edit-comment-btn" data-comment-id="${comment.id}" data-course-id="${courseId}"><i class="fas fa-edit me-1"></i>${translations[currentLanguage].editCommentBtn}</button>`;
            actionsHTML += `<button class="delete-comment-btn" data-comment-id="${comment.id}" data-course-id="${courseId}"><i class="fas fa-trash-alt me-1"></i>${translations[currentLanguage].deleteCommentBtn}</button>`;
        }
        if (currentUser.role === 'admin') {
            if (!comment.approved) {
                actionsHTML += `<button class="approve-comment-btn" data-comment-id="${comment.id}" data-course-id="${courseId}"><i class="fas fa-check-circle me-1"></i>${translations[currentLanguage].approveCommentBtn}</button>`;
            }
            if (currentUser.uid !== comment.authorId) { 
                 actionsHTML += `<button class="delete-comment-btn admin-delete" data-comment-id="${comment.id}" data-course-id="${courseId}"><i class="fas fa-trash-alt me-1"></i>${translations[currentLanguage].deleteCommentBtn}</button>`;
            }
        }
    }
    const pendingText = !comment.approved && currentUser && (currentUser.role === 'admin' || currentUser.uid === comment.authorId) ? `<p class="pending-approval-text">${translations[currentLanguage].pendingApprovalText}</p>` : '';

    item.innerHTML = `
        <div class="flex justify-between items-start">
            <p class="comment-author">${authorName} ${authorRoleText}</p>
            <div class="comment-actions text-xs">${actionsHTML}</div>
        </div>
        <p class="comment-text">${comment.text.replace(/\n/g, '<br>')}</p>
        <p class="comment-timestamp">${date}</p>
        ${pendingText}
    `;
    commentsListContainer.appendChild(item);

    item.querySelectorAll('.edit-comment-btn').forEach(btn => btn.addEventListener('click', () => loadCommentForEditing(btn.dataset.courseId, btn.dataset.commentId)));
    item.querySelectorAll('.delete-comment-btn').forEach(btn => btn.addEventListener('click', () => confirmDeleteComment(btn.dataset.courseId, btn.dataset.commentId)));
    item.querySelectorAll('.approve-comment-btn').forEach(btn => btn.addEventListener('click', () => approveComment(btn.dataset.courseId, btn.dataset.commentId)));
}

addCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showCustomAlert("authLoginError", translations[currentLanguage].loginToInteract || "You must be logged in to comment.", "warning"); return; }

    const courseId = commentCourseIdInput.value;
    const text = commentTextInput.value.trim();
    const editingId = editingCommentIdInput.value;

    if (!text) return;

    if (editingId) {
        const commentRef = doc(db, commentsCollectionPath(courseId), editingId);
        try {
            await updateDoc(commentRef, { text: text, updatedAt: serverTimestamp() });
            showCustomAlert("commentUpdatedSuccess", "commentUpdatedSuccessMsg", "success");
            addCommentForm.reset();
            editingCommentIdInput.value = '';
            addCommentForm.querySelector('button[type="submit"] span').textContent = translations[currentLanguage].submitCommentBtn || "Submit Comment";
        } catch (error) {
            showCustomAlert("commentUpdateError", "commentUpdateErrorMsg", "error", error.message);
        }
    } else {
        const newComment = {
            courseId: courseId,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email,
            authorRole: currentUser.role,
            text: text,
            timestamp: serverTimestamp(),
            approved: currentUser.role === 'admin',
        };
        try {
            await addDoc(collection(db, commentsCollectionPath(courseId)), newComment);
             const messageKey = newComment.approved ? "commentAddedSuccessMsg" : "commentAddedPendingApprovalMsg";
            showCustomAlert("commentAddedSuccess", messageKey, "success");
            addCommentForm.reset();
            const courseDocRef = doc(db, coursesCollectionPath, courseId);
            await runTransaction(db, async (transaction) => {
                const courseSnap = await transaction.get(courseDocRef);
                if (!courseSnap.exists()) throw "Course not found for comment count update";
                const newCount = (courseSnap.data().commentCount || 0) + 1;
                transaction.update(courseDocRef, { commentCount: newCount });
            });
        } catch (error) {
            showCustomAlert("commentAddError", "commentAddErrorMsg", "error", error.message);
        }
    }
});

async function loadCommentForEditing(courseId, commentId) {
    const commentRef = doc(db, commentsCollectionPath(courseId), commentId);
    try {
        const docSnap = await getDoc(commentRef);
        if (docSnap.exists()) {
            const commentData = docSnap.data();
            if (currentUser && currentUser.uid === commentData.authorId) {
                commentTextInput.value = commentData.text;
                editingCommentIdInput.value = commentId;
                commentCourseIdInput.value = courseId;
                addCommentForm.querySelector('button[type="submit"] span').textContent = translations[currentLanguage].saveChangesBtn || "Save Changes";
                commentTextInput.focus();
            }
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} Error loading comment for editing (Course: ${courseId}, Comment: ${commentId}):`, error);
    }
}

async function confirmDeleteComment(courseId, commentId) {
    const commentRef = doc(db, commentsCollectionPath(courseId), commentId);
    try {
        const docSnap = await getDoc(commentRef);
        if (docSnap.exists()) {
            const commentData = docSnap.data();
            if (!currentUser || (currentUser.uid !== commentData.authorId && currentUser.role !== 'admin')) {
                showCustomAlert("authAccessDenied", "You do not have permission to delete this comment.", "error");
                return;
            }
            proceedWithDeleteConfirmation(courseId, commentId);
        } else {
             showCustomAlert("commentDeleteError", "Comment not found.", "error");
        }
    } catch (error) {
         showCustomAlert("commentDeleteError", "Error fetching comment details for deletion.", "error");
    }
}

function proceedWithDeleteConfirmation(courseId, commentId) {
    const title = translations[currentLanguage].confirmCommentDeleteTitle || "Confirm Delete";
    const msg = translations[currentLanguage].confirmCommentDeleteMsg || "Are you sure?";
    if (window.confirm(`${title}\n${msg}`)) {
        deleteCommentFirestore(courseId, commentId);
    }
}

async function deleteCommentFirestore(courseId, commentId) {
    const commentRef = doc(db, commentsCollectionPath(courseId), commentId);
    try {
        await deleteDoc(commentRef);
        showCustomAlert("commentDeletedSuccess", "commentDeletedSuccessMsg", "success");
        const courseDocRef = doc(db, coursesCollectionPath, courseId);
        await runTransaction(db, async (transaction) => {
            const courseSnap = await transaction.get(courseDocRef);
            if (!courseSnap.exists()) throw "Course not found for comment count update";
            const newCount = Math.max(0, (courseSnap.data().commentCount || 0) - 1);
            transaction.update(courseDocRef, { commentCount: newCount });
        });
    } catch (error) {
        showCustomAlert("commentDeleteError", "commentDeleteErrorMsg", "error", error.message);
    }
}

async function approveComment(courseId, commentId) {
    if (!currentUser || !currentUser.uid) {
        showCustomAlert("authAccessDenied", "User not properly authenticated to approve comments.", "error");
        console.error(`${LOG_PREFIX} Attempted to approve comment without a valid currentUser.uid. CurrentUser:`, currentUser);
        return;
    }
    if (currentUser.role !== 'admin') {
        showCustomAlert("authAccessDenied", "Only admins can approve comments.", "error");
        return;
    }

    const commentRef = doc(db, commentsCollectionPath(courseId), commentId);
    const updateData = {
        approved: true,
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        updatedAt: serverTimestamp()
    };

    console.log(`${LOG_PREFIX} Attempting to approve comment ${commentId} for course ${courseId}. User: ${currentUser.uid}, Role: ${currentUser.role}. Update data:`, JSON.stringify(updateData));

    try {
        await updateDoc(commentRef, updateData);
        console.log(`${LOG_PREFIX} Comment ${commentId} approved successfully.`);
        showCustomAlert("commentApprovedSuccess", "commentApprovedSuccessMsg", "success");
    } catch (error) {
        console.error(`${LOG_PREFIX} Firestore Error approving comment ${commentId} for course ${courseId}:`, error);
        let detailedErrorMessage = error.message;
        if (error.details) {
            detailedErrorMessage += ` Details: ${JSON.stringify(error.details)}`;
        }
        if (error.code === 'invalid-argument' || (error.http && error.http.status === 400)) {
             console.error("Detailed Firestore Bad Request error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }
        showCustomAlert("commentApproveError", "commentApproveErrorMsg", "error", detailedErrorMessage);
    }
}

function initParticles() {
    if (document.getElementById('particles-js')) {
        const isDark = document.documentElement.classList.contains('dark');
        particlesJS("particles-js", {
            "particles": {
                "number": { "value": 15, "density": { "enable": true, "value_area": 900 } }, "color": { "value": isDark ? '#3A475A' : '#D1D5DB' },
                "shape": { "type": "circle" }, "opacity": { "value": 0.12, "random": true, "anim": { "enable": true, "speed": 0.08, "opacity_min": 0.005, "sync": false } },
                "size": { "value": 1.5, "random": true }, "line_linked": { "enable": true, "distance": 180, "color": isDark ? '#2D3748' : '#E5E7EB', "opacity": 0.08, "width": 0.5 },
                "move": { "enable": true, "speed": 0.4, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false }, "resize": true },
                "modes": { "grab": { "distance": 100, "line_linked": { "opacity": 0.12 } } }
            }, "retina_detect": true
        });
    }
}

const scrollObserverOptions = { root: null, rootMargin: '0px', threshold: 0.08 };
const scrollObserverCallback = (entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }); };
const scrollObserver = new IntersectionObserver(scrollObserverCallback, scrollObserverOptions);

const homePageCategoryData = [
    { category: "تحليل البيانات", accent: "var(--accent-primary)", icon: "fa-chart-pie", titleKey: "catDataAnalysisTitle", descKey: "catDataAnalysisDesc" },
    { category: "الذكاء الاصطناعي", accent: "var(--accent-secondary)", icon: "fa-microchip", titleKey: "catAITitle", descKey: "catAIDesc" },
    { category: "البرمجة", accent: "#DD6B20", icon: "fa-laptop-code", titleKey: "catProgrammingTitle", descKey: "catProgrammingDesc" },
    { category: "تطوير الواجهات الأمامية", accent: "#D53F8C", icon: "fa-palette", titleKey: "catFrontendTitle", descKey: "catFrontendDesc" },
    { category: "تطوير الواجهات الخلفية", accent: "#805AD5", icon: "fa-database", titleKey: "catBackendTitle", descKey: "catBackendDesc" },
    { category: "أمن المعلومات", accent: "var(--accent-danger)", icon: "fa-user-shield", titleKey: "catInfoSecTitle", descKey: "catInfoSecDesc" },
    { category: "تطوير تطبيقات الموبايل", accent: "#667EEA", icon: "fa-mobile-alt", titleKey: "catMobileDevTitle", descKey: "catMobileDevDesc" },
    { category: "علوم البيانات", accent: "#ED64A6", icon: "fa-flask", titleKey: "catDataScienceTitle", descKey: "catDataScienceDesc" },
    { category: "الحوسبة السحابية", accent: "#4FD1C5", icon: "fa-cloud", titleKey: "catCloudComputingTitle", descKey: "catCloudComputingDesc" },
    { category: "إنترنت الأشياء", accent: "#F6E05E", icon: "fa-wifi", titleKey: "catIoTTitle", descKey: "catIoTDesc" },
    { category: "تطوير الألعاب", accent: "#A0AEC0", icon: "fa-gamepad", titleKey: "catGameDevTitle", descKey: "catGameDevDesc" },
    { category: "DevOps", accent: "#FBBF24", icon: "fa-tools", titleKey: "catDevOpsTitle", descKey: "catDevOpsDesc" },
    { category: "بلوكتشين", accent: "#34D399", icon: "fa-link", titleKey: "catBlockchainTitle", descKey: "catBlockchainDesc" },
    { category: "الروبوتات", accent: "#9CA3AF", icon: "fa-robot", titleKey: "catRoboticsTitle", descKey: "catRoboticsDesc" },
    { category: "أمن سيبراني متقدم", accent: "#EF4444", icon: "fa-shield-alt", titleKey: "catAdvCybersecTitle", descKey: "catAdvCybersecDesc" },
    { category: "تصميم واجهات وتجربة المستخدم", accent: "#A78BFA", icon: "fa-drafting-compass", titleKey: "catUIUXTitle", descKey: "catUIUXDesc" },
    { category: "الحوسبة الكمومية", accent: "#9F7AEA", icon: "fa-atom", titleKey: "catQuantumTitle", descKey: "catQuantumDesc" },
    { category: "المعلوماتية الحيوية", accent: "#F59E0B", icon: "fa-dna", titleKey: "catBioinfoTitle", descKey: "catBioinfoDesc" },
    { category: "الاختراق الأخلاقي", accent: "#10B981", icon: "fa-user-secret", titleKey: "catEthicalHackingTitle", descKey: "catEthicalHackDesc" },
    { category: "التكنولوجيا المالية", accent: "#6366F1", icon: "fa-chart-line", titleKey: "catFintechTitle", descKey: "catFintechDesc" },
    { category: "الواقع الممتد (XR)", accent: "#EC4899", icon: "fa-cubes", titleKey: "catXRTitle", descKey: "catXRDesc" },
    { category: "هندسة البيانات", accent: "#4A90E2", icon: "fa-cogs", titleKey: "catDataEngTitle", descKey: "catDataEngDesc" },
    { category: "التعلم العميق", accent: "#50E3C2", icon: "fa-brain", titleKey: "catDeepLearnTitle", descKey: "catDeepLearnDesc" },
    { category: "تطوير الويب الكامل", accent: "#BD10E0", icon: "fa-layer-group", titleKey: "catFullStackTitle", descKey: "catFullStackDesc" },
    { category: "هندسة الحلول السحابية", accent: "#F8E71C", icon: "fa-cloud-upload-alt", titleKey: "catCloudSolArchTitle", descKey: "catCloudSolArchDesc" },
    { category: "الأتمتة الروبوتية للعمليات", accent: "#B8E986", icon: "fa-tasks", titleKey: "catRPATitle", descKey: "catRPADesc" }
];

function renderHomeCategories() {
    if (!homeCategoriesGrid) { console.error("Home categories grid not found!"); return; }
    homeCategoriesGrid.innerHTML = '';
    homePageCategoryData.forEach((catData, index) => {
        const card = document.createElement('div');
        card.className = 'category-card-home nav-link-item home-category-reveal';
        card.dataset.page = "courses";
        card.dataset.category = catData.category;
        card.dataset.accentColor = catData.accent;
        const titleText = translations[currentLanguage][catData.titleKey] || catData.category;
        const descText = translations[currentLanguage][catData.descKey] || "Description placeholder";
        card.innerHTML = `
            <div class="icon-wrapper"><i class="fas ${catData.icon}"></i></div>
            <h3>${titleText}</h3>
            <p>${descText}</p>
        `;
        card.style.transitionDelay = `${index * 0.03}s`;
        homeCategoriesGrid.appendChild(card);
        scrollObserver.observe(card);
    });
    applyCategoryCardAccentColors();
}

const sampleCourses = [
    { nameAr: "مقدمة في تحليل البيانات باستخدام Python و Pandas", sectionAr: "تحليل البيانات", youtubeLink: "https://www.example.com/data-analysis-pandas", imageUrl: "https://placehold.co/600x340/4299E1/F7FAFC?text=Pandas+تحليل+البيانات&font=changa", likeCount: 0, commentCount: 0 },
    { nameAr: "أساسيات تعلم الآلة: النماذج والخوارزميات", sectionAr: "الذكاء الاصطناعي", youtubeLink: "https://www.example.com/machine-learning-basics", imageUrl: "https://placehold.co/600x340/38B2AC/F7FAFC?text=تعلم+الآلة&font=changa", likeCount: 0, commentCount: 0 },
    { nameAr: "دورة Python الشاملة: من الصفر إلى الاحتراف", sectionAr: "البرمجة", youtubeLink: "https://www.example.com/python-complete-course", imageUrl: "https://placehold.co/600x340/DD6B20/F7FAFC?text=Python+الشاملة&font=changa", likeCount: 0, commentCount: 0 },
    { nameAr: "تطوير تطبيقات ويب تفاعلية مع React", sectionAr: "تطوير الواجهات الأمامية", youtubeLink: "https://www.example.com/react-interactive-web", imageUrl: "https://placehold.co/600x340/D53F8C/F7FAFC?text=React+تطوير+الويب&font=changa", likeCount: 0, commentCount: 0 },
    { nameAr: "بناء واجهات برمجة تطبيقات RESTful باستخدام Node.js", sectionAr: "تطوير الواجهات الخلفية", youtubeLink: "https://www.example.com/nodejs-restful-apis", imageUrl: "https://placehold.co/600x340/805AD5/F7FAFC?text=Node.js+APIs&font=changa", likeCount: 0, commentCount: 0 },
    { nameAr: "مبادئ الأمن السيبراني وحماية الشبكات", sectionAr: "أمن المعلومات", youtubeLink: "https://www.example.com/cybersecurity-principles", imageUrl: "https://placehold.co/600x340/F56565/F7FAFC?text=الأمن+السيبراني&font=changa", likeCount: 0, commentCount: 0 },
];
async function addSampleCoursesToFirestore() {
    const sampleCoursesAddedFlag = `sampleCoursesAdded_${globalAppId}_v3.22_full_list`;
    if (localStorage.getItem(sampleCoursesAddedFlag) === 'true') { console.info(LOG_PREFIX + "Sample courses (v3.22 full list) already marked as added. Skipping."); return; }
    console.info(LOG_PREFIX + "Adding/Verifying sample courses (v3.22 full list) in Firestore...");
    let coursesAddedCount = 0;
    for (const course of sampleCourses) {
        const existingCourseQuery = query(coursesCollectionRef, where("nameAr", "==", course.nameAr), where("sectionAr", "==", course.sectionAr), limit(1));
        try {
            const existingSnapshot = await getDocs(existingCourseQuery);
            if (existingSnapshot.empty) {
                const courseData = { ...course, timestamp: serverTimestamp(), addedBy: "system_sample_data_owner" };
                await addDoc(coursesCollectionRef, courseData);
                coursesAddedCount++;
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} Error adding/checking sample course "${course.nameAr}":`, error);
        }
    }
    if (coursesAddedCount > 0) {
        console.info(`${LOG_PREFIX} Successfully added ${coursesAddedCount} new sample courses (v3.22 full list).`);
    }
    localStorage.setItem(sampleCoursesAddedFlag, 'true');
}

if (scrollToTopBtn) {
    window.onscroll = function () { if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) { scrollToTopBtn.style.display = "flex"; } else { scrollToTopBtn.style.display = "none"; } };
    scrollToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

function populateCourseSectionSelects() {
    const selects = [courseSectionSelect, editCourseSectionSelect];
    selects.forEach(selectEl => {
        if (!selectEl) return;
        const currentValue = selectEl.value;
        const placeholderOption = selectEl.querySelector('option[value=""]');
        selectEl.innerHTML = '';
        if (placeholderOption) {
            placeholderOption.textContent = translations[currentLanguage]['selectSectionOption'] || "-- Select Section --";
            selectEl.appendChild(placeholderOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = translations[currentLanguage]['selectSectionOption'] || "-- اختر القسم --";
            defaultOption.disabled = true;
            selectEl.appendChild(defaultOption);
        }
        homePageCategoryData.forEach(catData => {
            const option = document.createElement('option');
            option.value = catData.category;
            option.textContent = translations[currentLanguage][catData.titleKey] || catData.category;
            selectEl.appendChild(option);
        });

        if (currentValue && selectEl.querySelector(`option[value="${currentValue}"]`)) {
            selectEl.value = currentValue;
        } else if (placeholderOption){
             placeholderOption.selected = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.info(`${LOG_PREFIX} DOM Content Loaded. Initializing App...`);
    const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(storedTheme); initParticles();
    document.getElementById('current-year').textContent = new Date().getFullYear();

    renderHomeCategories();

    document.querySelectorAll('.scroll-reveal, .home-category-reveal, .course-item-reveal').forEach((el, index) => {
        el.style.transitionDelay = `${index * 0.03}s`;
        scrollObserver.observe(el);
    });

    if (!auth || !db) { console.error(`${LOG_PREFIX} Firebase services unavailable at DOMContentLoaded.`); showCustomAlert("Critical Error", "Failed to load essential services. Application cannot run.", "error"); return; }
    const preferredLang = localStorage.getItem('preferredLanguage') || 'ar';
    setLanguage(preferredLang);
    populateCourseSectionSelects();
    initAuth().then(async () => {
        await addSampleCoursesToFirestore();
        route();
        console.info(`${LOG_PREFIX} App Initialized. Auth ready. Sample courses checked/added. Initial route processed.`);
    }).catch(err => {
        console.error(`${LOG_PREFIX} Error during app init sequence:`, err);
        route();
    });
    window.addEventListener('hashchange', route);
    console.log(`${LOG_PREFIX} Event listeners (DOMContentLoaded, hashchange) attached.`);
});

