// TODO: replace PAY button with real XDRSigningFlow once merged in frontend-SafeTrust
// Sources:
//   frontend-SafeTrust/src/components/escrow/XDRSigningFlow.tsx
//   frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx
//   frontend-SafeTrust/src/components/escrow/InvoiceHeader.tsx
//
// Flow (when wired):
//   PAY → signXDR() via Freighter → POST /helper/send-transaction
//   → router.push(`/hotel/${id}/escrow/${newEscrowId}`)

import { ProcessStepper } from '@/components/escrow/ProcessStepper';
import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { XDRSigningFlowStub } from '@/components/escrow/XDRSigningFlowStub';

export default function EscrowCreatePage({
    params,
}: {
    params: { id: string };
}) {
    return (
        <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-50 py-12">
            <div className="max-w-6xl mx-auto px-6">
                <InvoiceHeader invoiceNumber="INV4257-09-012" status="pending" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                    {/* Left — property details + PAY */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass rounded-3xl p-8 bg-white/40 shadow-2xl shadow-slate-200/50 space-y-8">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">La Sabana</h2>
                                    <p className="text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                        <span className="text-lg">📍</span> 329 Calle santos, paseo colón, San José
                                    </p>
                                </div>
                                {/* TODO: replace with real PAY → XDRSigningFlow */}
                                <button
                                    disabled
                                    className="bg-orange-500 text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-orange-200 opacity-60 cursor-not-allowed transform hover:scale-105 transition-all duration-300 uppercase tracking-widest text-sm"
                                    title="Wallet signing — coming soon"
                                >
                                    Confirm & Pay
                                </button>
                            </div>

                            {/* Image placeholder */}
                            <div className="grid grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group">
                                        <span className="text-slate-300 group-hover:text-slate-400 transition-colors text-2xl font-bold">{i}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <span>🛏</span> 2 bd
                                </div>
                                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <span>🐾</span> pet friendly
                                </div>
                                <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <span>🚿</span> 1 ba
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-3">
                                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Property details</h3>
                                    <p className="text-slate-600 leading-relaxed font-medium">
                                        Beautifully curated apartment in the heart of San José. Features modern finishes and easy access to local amenities.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Owner contact</h3>
                                    <div className="space-y-2">
                                        <p className="text-slate-700 font-bold flex items-center gap-2">
                                            <span className="text-slate-400">📞</span> +506 6485 2179
                                        </p>
                                        <p className="text-slate-700 font-bold flex items-center gap-2 underline decoration-blue-200 decoration-2 underline-offset-4 pointer-events-none">
                                            <span className="text-slate-400">✉️</span> albertoCasas100@gmail.com
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right — Notes + Process stepper */}
                    <div className="space-y-6">
                        <div className="border rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200/50">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Internal Notes</h3>
                            <textarea
                                className="w-full text-sm font-medium border-slate-200 rounded-xl p-4 h-32 resize-none focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-slate-50/50 placeholder:text-slate-300"
                                placeholder="Add private notes for your records..."
                            />
                        </div>
                        <ProcessStepper currentStep={1} />
                    </div>
                </div>
            </div>
        </main>
    );
}
