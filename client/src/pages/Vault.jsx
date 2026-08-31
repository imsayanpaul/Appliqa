import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function Vault({ user }) {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#D8D4CC] shadow-xs text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-xl bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center mx-auto border border-[#F45B25]/20 shadow-xs">
          <Shield size={28} />
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block">
            CANDIDATE REPOSITORY
          </span>
          <h1 className="text-2xl font-black text-[#171717] tracking-tight m-0">
            My Vault
          </h1>
          <p className="text-xs text-[#66615C] max-w-xs mx-auto">
            Secure private document storage and credential assets for your career pipeline.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
