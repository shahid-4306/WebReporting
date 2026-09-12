// // import { db } from "@/api/base44Client";
// // import React, { useState } from "react";
// // import { safeReturnTo } from "@/lib/authReturnTo";

// // export default function Login() {
// //   const [username, setUsername] = useState("");
// //   const [password, setPassword] = useState("");
// //   const [error, setError] = useState("");
// //   const [loading, setLoading] = useState(false);
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [alertDismissed, setAlertDismissed] = useState(false);

// //   // Post-login destination (e.g. the MCP OAuth consent page sends users here
// //   // with returnTo so the grant flow can resume). Same-origin paths only.
// //   const returnTo = safeReturnTo();
// //   const currentYear = new Date().getFullYear();

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     setError("");
// //     setAlertDismissed(false);
// //     setLoading(true);
// //     try {
// //       await db.auth.loginViaUsernamePassword(username, password);
// //       window.location.href = returnTo;
// //     } catch (err) {
// //       setError(err.message || "Invalid username or password");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const showAlert = error && !alertDismissed;

// //   return (
// //     <div className="h-full min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 antialiased relative selection:bg-brandBlue-700 selection:text-white">
// //       {/* Decorative background */}
// //       <div
// //         aria-hidden="true"
// //         className="absolute inset-0 bg-grid-pattern pointer-events-none -z-10"
// //       />
// //       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
// //       <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

// //       {/* HEADER */}
// //       <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
// //         <div className="w-full px-2 sm:px-3 lg:px-4 h-14 flex items-center justify-between">
// //           <div className="flex items-center gap-3 sm:gap-6">
// //             <a
// //               aria-label="Powersoft 360 Technology Solutions"
// //               className="flex items-center focus:outline-none focus:ring-2 focus:ring-brandBlue-700 rounded transition-opacity hover:opacity-95"
// //               href="#"
// //             >
// //               <img
// //                 alt="Powersoft 360 - Innovation to move forward"
// //                 className="h-9 sm:h-10 w-auto object-contain"
// //                 src="/LogoPS360.png"
// //               />
// //             </a>
// //           </div>
// //           <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
// //             <svg
// //               aria-hidden="true"
// //               className="w-4 h-4 text-emerald-600"
// //               fill="currentColor"
// //               viewBox="0 0 20 20"
// //             >
// //               <path
// //                 clipRule="evenodd"
// //                 d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
// //                 fillRule="evenodd"
// //               />
// //             </svg>
// //             <span>256-Bit SSL Secured</span>
// //           </div>
// //         </div>
// //       </header>

// //       {/* MAIN */}
// //       <main className="flex-grow flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
// //         <div className="w-full max-w-md">
// //           <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 overflow-hidden">
// //             {/* Top accent bar */}
// //             <div className="h-1.5 w-full flex">
// //               <div className="h-full w-1/2 bg-red-600" />
// //               <div className="h-full w-1/2 bg-brandBlue-700" />
// //             </div>

// //             <div className="p-5 sm:p-6">
// //               {/* Title */}
// //               <div className="text-center mb-5">
// //                 <div className="inline-flex items-center justify-center p-2 mb-3 bg-slate-50 border border-slate-100 rounded-xl">
// //                   <img
// //                     alt="Sonex Logo"
// //                     className="h-6 w-auto object-contain"
// //                     src="/SonexLogo.png"
// //                   />
// //                 </div>
// //                 <h1 className="text-2xl font-bold tracking-tight text-slate-900">
// //                   Sonex Enterprise Portal
// //                 </h1>
// //                 <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
// //                   <span>Login with your username and password</span>
// //                 </p>
// //               </div>

// //               {/* Error alert */}
// //               {showAlert && (
// //                 <div
// //                   className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 transition-all duration-200"
// //                   role="alert"
// //                 >
// //                   <svg
// //                     className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
// //                     fill="none"
// //                     stroke="currentColor"
// //                     viewBox="0 0 24 24"
// //                   >
// //                     <path
// //                       d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
// //                       strokeLinecap="round"
// //                       strokeLinejoin="round"
// //                       strokeWidth="2"
// //                     />
// //                   </svg>
// //                   <div className="flex-1">
// //                     <span className="font-medium">Authentication Failed:</span>
// //                     <span className="block text-red-700 mt-0.5">{error}</span>
// //                   </div>
// //                   <button
// //                     aria-label="Dismiss error message"
// //                     className="text-red-500 hover:text-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
// //                     type="button"
// //                     onClick={() => setAlertDismissed(true)}
// //                   >
// //                     <svg
// //                       className="w-4 h-4"
// //                       fill="none"
// //                       stroke="currentColor"
// //                       viewBox="0 0 24 24"
// //                     >
// //                       <path
// //                         d="M6 18L18 6M6 6l12 12"
// //                         strokeLinecap="round"
// //                         strokeLinejoin="round"
// //                         strokeWidth="2"
// //                       />
// //                     </svg>
// //                   </button>
// //                 </div>
// //               )}

// //               {/* Form */}
// //               <form onSubmit={handleSubmit} className="space-y-3" noValidate>
// //                 {/* Username */}
// //                 <div>
// //                   <label
// //                     className="block text-sm font-semibold text-slate-700"
// //                     htmlFor="username"
// //                   >
// //                     Username
// //                   </label>
// //                   <div className="relative mt-1.5 rounded-lg shadow-sm">
// //                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
// //                       <svg
// //                         className="h-5 w-5"
// //                         fill="none"
// //                         stroke="currentColor"
// //                         viewBox="0 0 24 24"
// //                       >
// //                         <path
// //                           d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
// //                           strokeLinecap="round"
// //                           strokeLinejoin="round"
// //                           strokeWidth="2"
// //                         />
// //                       </svg>
// //                     </div>
// //                     <input
// //                       autoComplete="username"
// //                       autoCapitalize="off"
// //                       autoFocus
// //                       className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
// //                       id="username"
// //                       name="username"
// //                       placeholder="Enter Your Username"
// //                       required
// //                       type="text"
// //                       value={username}
// //                       onChange={(e) => setUsername(e.target.value)}
// //                     />
// //                   </div>
// //                 </div>

// //                 {/* Password */}
// //                 <div>
// //                   <div className="flex items-center justify-between">
// //                     <label
// //                       className="block text-sm font-semibold text-slate-700"
// //                       htmlFor="password"
// //                     >
// //                       Password
// //                     </label>
// //                   </div>
// //                   <div className="relative mt-1.5 rounded-lg shadow-sm">
// //                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
// //                       <svg
// //                         className="h-5 w-5"
// //                         fill="none"
// //                         stroke="currentColor"
// //                         viewBox="0 0 24 24"
// //                       >
// //                         <path
// //                           d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
// //                           strokeLinecap="round"
// //                           strokeLinejoin="round"
// //                           strokeWidth="2"
// //                         />
// //                       </svg>
// //                     </div>
// //                     <input
// //                       autoComplete="current-password"
// //                       className="block w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
// //                       id="password"
// //                       name="password"
// //                       placeholder="••••••••"
// //                       required
// //                       type={showPassword ? "text" : "password"}
// //                       value={password}
// //                       onChange={(e) => setPassword(e.target.value)}
// //                     />
// //                     <button
// //                       aria-label="Toggle password visibility"
// //                       className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-brandBlue-700"
// //                       type="button"
// //                       onClick={() => setShowPassword((v) => !v)}
// //                     >
// //                       {showPassword ? (
// //                         <svg
// //                           className="h-5 w-5"
// //                           fill="none"
// //                           stroke="currentColor"
// //                           viewBox="0 0 24 24"
// //                         >
// //                           <path
// //                             d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
// //                             strokeLinecap="round"
// //                             strokeLinejoin="round"
// //                             strokeWidth="2"
// //                           />
// //                         </svg>
// //                       ) : (
// //                         <svg
// //                           className="h-5 w-5"
// //                           fill="none"
// //                           stroke="currentColor"
// //                           viewBox="0 0 24 24"
// //                         >
// //                           <path
// //                             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
// //                             strokeLinecap="round"
// //                             strokeLinejoin="round"
// //                             strokeWidth="2"
// //                           />
// //                           <path
// //                             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
// //                             strokeLinecap="round"
// //                             strokeLinejoin="round"
// //                             strokeWidth="2"
// //                           />
// //                         </svg>
// //                       )}
// //                     </button>
// //                   </div>
// //                 </div>

// //                 {/* Submit */}
// //                 <div className="pt-2">
// //                   <button
// //                     className="w-full relative flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brandBlue-700 hover:bg-brandBlue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandBlue-700 active:transform active:scale-[0.99] smooth-transition disabled:opacity-70 disabled:cursor-not-allowed"
// //                     type="submit"
// //                     disabled={loading}
// //                   >
// //                     {loading && (
// //                       <svg
// //                         className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
// //                         fill="none"
// //                         viewBox="0 0 24 24"
// //                       >
// //                         <circle
// //                           className="opacity-25"
// //                           cx="12"
// //                           cy="12"
// //                           r="10"
// //                           stroke="currentColor"
// //                           strokeWidth="4"
// //                         />
// //                         <path
// //                           className="opacity-75"
// //                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
// //                           fill="currentColor"
// //                         />
// //                       </svg>
// //                     )}
// //                     <span>
// //                       {loading
// //                         ? "Verifying credentials..."
// //                         : "Sign in to Portal"}
// //                     </span>
// //                   </button>
// //                 </div>
// //               </form>

// //               {/* Card footer */}
// //               <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
// //                 <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
// //                   <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
// //                   Sonex Operations Cloud
// //                 </span>
// //                 <span className="text-xs text-slate-400 font-medium">
// //                   Platform by{" "}
// //                   <span className="text-brandBlue-700 font-semibold">
// //                     Powersoft 360
// //                   </span>
// //                 </span>
// //               </div>
// //             </div>
// //           </div>

// //           {/* Security guarantee */}
// //         </div>
// //       </main>
// //     </div>
// //   );
// // }
// import { db } from "@/api/base44Client";
// import React, { useState } from "react";
// import { safeReturnTo } from "@/lib/authReturnTo";

// export default function Login() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [alertDismissed, setAlertDismissed] = useState(false);

//   // Post-login destination (e.g. the MCP OAuth consent page sends users here
//   // with returnTo so the grant flow can resume). Same-origin paths only.
//   const returnTo = safeReturnTo();
//   const currentYear = new Date().getFullYear();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setAlertDismissed(false);
//     setLoading(true);
//     try {
//       await db.auth.loginViaUsernamePassword(username, password);
//       window.location.href = returnTo;
//     } catch (err) {
//       setError(err.message || "Invalid username or password");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const showAlert = error && !alertDismissed;

//   return (
//     <div className="h-full min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 antialiased relative selection:bg-brandBlue-700 selection:text-white">
//       {/* Decorative background */}
//       <div
//         aria-hidden="true"
//         className="absolute inset-0 bg-grid-pattern pointer-events-none -z-10"
//       />
//       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
//       <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

//       {/* HEADER */}
//       <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
//         <div className="w-full px-2 sm:px-3 lg:px-4 h-14 flex items-center justify-between">
//           <div className="flex items-center gap-3 sm:gap-6">
//             <a
//               aria-label="Powersoft 360 Technology Solutions"
//               className="flex items-center focus:outline-none focus:ring-2 focus:ring-brandBlue-700 rounded transition-opacity hover:opacity-95"
//               href="#"
//             >
//               <img
//                 alt="Powersoft 360 - Innovation to move forward"
//                 className="h-9 sm:h-10 w-auto object-contain"
//                 src="/LogoPS360.png"
//               />
//             </a>
//           </div>
//           <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
//             <svg
//               aria-hidden="true"
//               className="w-4 h-4 text-emerald-600"
//               fill="currentColor"
//               viewBox="0 0 20 20"
//             >
//               <path
//                 clipRule="evenodd"
//                 d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
//                 fillRule="evenodd"
//               />
//             </svg>
//             <span>256-Bit SSL Secured</span>
//           </div>
//         </div>
//       </header>

//       {/* MAIN */}
//       <main className="flex-grow flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
//         <div className="w-full max-w-md">
//           <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 overflow-hidden">
//             {/* Top accent bar */}
//             <div className="h-1.5 w-full flex">
//               <div className="h-full w-1/2 bg-red-600" />
//               <div className="h-full w-1/2 bg-brandBlue-700" />
//             </div>

//             <div className="p-5 sm:p-6">
//               {/* Title */}
//               <div className="text-center mb-5">
//                 <div className="inline-flex items-center justify-center p-2 mb-3 bg-slate-50 border border-slate-100 rounded-xl">
//                   <img
//                     alt="Sonex Logo"
//                     className="h-6 w-auto object-contain"
//                     src="/SonexLogo.png"
//                   />
//                 </div>
//                 <h1 className="text-2xl font-bold tracking-tight text-slate-900">
//                   Sonex Enterprise Portal
//                 </h1>
//                 <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
//                   <span>Login with your username and password</span>
//                 </p>
//               </div>

//               {/* Error alert */}
//               {showAlert && (
//                 <div
//                   className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 transition-all duration-200"
//                   role="alert"
//                 >
//                   <svg
//                     className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth="2"
//                     />
//                   </svg>
//                   <div className="flex-1">
//                     <span className="font-medium">Authentication Failed:</span>
//                     <span className="block text-red-700 mt-0.5">{error}</span>
//                   </div>
//                   <button
//                     aria-label="Dismiss error message"
//                     className="text-red-500 hover:text-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
//                     type="button"
//                     onClick={() => setAlertDismissed(true)}
//                   >
//                     <svg
//                       className="w-4 h-4"
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path
//                         d="M6 18L18 6M6 6l12 12"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth="2"
//                       />
//                     </svg>
//                   </button>
//                 </div>
//               )}

//               {/* Form */}
//               <form onSubmit={handleSubmit} className="space-y-3" noValidate>
//                 {/* Username */}
//                 <div>
//                   <label
//                     className="block text-sm font-semibold text-slate-700"
//                     htmlFor="username"
//                   >
//                     Username
//                   </label>
//                   <div className="relative mt-1.5 rounded-lg shadow-sm">
//                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
//                       <svg
//                         className="h-5 w-5"
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth="2"
//                         />
//                       </svg>
//                     </div>
//                     <input
//                       autoComplete="username"
//                       autoCapitalize="off"
//                       autoFocus
//                       className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
//                       id="username"
//                       name="username"
//                       placeholder="Enter Your Username"
//                       required
//                       type="text"
//                       value={username}
//                       onChange={(e) => setUsername(e.target.value)}
//                     />
//                   </div>
//                 </div>

//                 {/* Password */}
//                 <div>
//                   <div className="flex items-center justify-between">
//                     <label
//                       className="block text-sm font-semibold text-slate-700"
//                       htmlFor="password"
//                     >
//                       Password
//                     </label>
//                   </div>
//                   <div className="relative mt-1.5 rounded-lg shadow-sm">
//                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
//                       <svg
//                         className="h-5 w-5"
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth="2"
//                         />
//                       </svg>
//                     </div>
//                     <input
//                       autoComplete="current-password"
//                       className="block w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
//                       id="password"
//                       name="password"
//                       placeholder="••••••••"
//                       required
//                       type={showPassword ? "text" : "password"}
//                       value={password}
//                       onChange={(e) => setPassword(e.target.value)}
//                     />
//                     <button
//                       aria-label="Toggle password visibility"
//                       className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-brandBlue-700"
//                       type="button"
//                       onClick={() => setShowPassword((v) => !v)}
//                     >
//                       {showPassword ? (
//                         <svg
//                           className="h-5 w-5"
//                           fill="none"
//                           stroke="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path
//                             d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth="2"
//                           />
//                         </svg>
//                       ) : (
//                         <svg
//                           className="h-5 w-5"
//                           fill="none"
//                           stroke="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path
//                             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth="2"
//                           />
//                           <path
//                             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth="2"
//                           />
//                         </svg>
//                       )}
//                     </button>
//                   </div>
//                 </div>

//                 {/* Submit */}
//                 <div className="pt-2">
//                   <button
//                     className="w-full relative flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brandBlue-700 hover:bg-brandBlue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandBlue-700 active:transform active:scale-[0.99] smooth-transition disabled:opacity-70 disabled:cursor-not-allowed"
//                     type="submit"
//                     disabled={loading}
//                   >
//                     {loading && (
//                       <svg
//                         className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                       >
//                         <circle
//                           className="opacity-25"
//                           cx="12"
//                           cy="12"
//                           r="10"
//                           stroke="currentColor"
//                           strokeWidth="4"
//                         />
//                         <path
//                           className="opacity-75"
//                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                           fill="currentColor"
//                         />
//                       </svg>
//                     )}
//                     <span>
//                       {loading
//                         ? "Verifying credentials..."
//                         : "Sign in to Portal"}
//                     </span>
//                   </button>
//                 </div>
//               </form>

//               {/* Card mini-status line */}
//               <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
//                 <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
//                   <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//                   Sonex Operations Cloud
//                 </span>
//                 <span className="text-xs text-slate-400 font-medium">
//                   Platform by{" "}
//                   <span className="text-brandBlue-700 font-semibold">
//                     Powersoft 360
//                   </span>
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>

//       {/* FOOTER */}
//       <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
//           <span>
//             &copy; {currentYear} Powersoft 360 Technology Solutions. All rights
//             reserved.
//           </span>
//         </div>
//       </footer>
//     </div>
//   );
// }

import { db } from "@/api/base44Client";
import React, { useState } from "react";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [now, setNow] = useState(new Date());

  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();
  const currentYear = new Date().getFullYear();

  // Live clock — updates every second
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAlertDismissed(false);
    setLoading(true);
    try {
      await db.auth.loginViaUsernamePassword(username, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = error && !alertDismissed;

  return (
    <div className="h-full min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 antialiased relative selection:bg-brandBlue-700 selection:text-white">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-grid-pattern pointer-events-none -z-10"
      />
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* HEADER */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="w-full pl-6 pr-2 sm:pl-10 sm:pr-3 lg:pl-14 lg:pr-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              aria-label="Powersoft 360 Technology Solutions"
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-brandBlue-700 rounded transition-opacity hover:opacity-95"
              href="#"
            >
              <img
                alt="Powersoft 360 - Innovation to move forward"
                className="h-9 sm:h-10 w-auto object-contain"
                src="/LogoPS360.png"
              />
            </a>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>
              {formattedDate} &bull; {formattedTime}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1.5 w-full flex">
              <div className="h-full w-1/2 bg-red-600" />
              <div className="h-full w-1/2 bg-brandBlue-700" />
            </div>

            <div className="p-5 sm:p-6">
              {/* Title */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center p-2 mb-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <img
                    alt="Sonex Logo"
                    className="h-12 sm:h-14 w-auto max-w-[220px] object-contain"
                    src="/SonexLogo.png"
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sonex Enterprise Portal
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
                  <span>Login with your username and password</span>
                </p>
              </div>

              {/* Error alert */}
              {showAlert && (
                <div
                  className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 transition-all duration-200"
                  role="alert"
                >
                  <svg
                    className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium">Authentication Failed:</span>
                    <span className="block text-red-700 mt-0.5">{error}</span>
                  </div>
                  <button
                    aria-label="Dismiss error message"
                    className="text-red-500 hover:text-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    type="button"
                    onClick={() => setAlertDismissed(true)}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Username */}
                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <div className="relative mt-1.5 rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      autoComplete="username"
                      autoCapitalize="off"
                      autoFocus
                      className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
                      id="username"
                      name="username"
                      placeholder="Enter Your Username"
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-sm font-semibold text-slate-700"
                      htmlFor="password"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative mt-1.5 rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      autoComplete="current-password"
                      className="block w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandBlue-700 focus:ring-2 focus:ring-brandBlue-700/20 smooth-transition outline-none"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-brandBlue-700"
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <path
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    className="w-full relative flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brandBlue-700 hover:bg-brandBlue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandBlue-700 active:transform active:scale-[0.99] smooth-transition disabled:opacity-70 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading}
                  >
                    {loading && (
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    <span>
                      {loading
                        ? "Verifying credentials..."
                        : "Sign in to Portal"}
                    </span>
                  </button>
                </div>
              </form>

              {/* Card mini-status line */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sonex Operations Cloud
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Platform by{" "}
                  <span className="text-brandBlue-700 font-semibold">
                    Powersoft 360
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* FOOTER */}
      <footer className="w-full flex justify-center px-4 py-4">
        <div className="inline-flex items-center justify-center border-t border-slate-300 pt-3 text-center">
          <span className="text-sm sm:text-base font-strong text-slate-600 tracking-wide whitespace-nowrap">
            © {currentYear} Powered by Powersoft360. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
