import { useState } from 'react';
import { Shield, CheckCircle, Settings } from 'lucide-react';

interface VisionTabsProps {
  activeVision: 'safety' | 'quality';
  onVisionChange: (vision: 'safety' | 'quality') => void;
}

export function VisionTabs({ activeVision, onVisionChange }: VisionTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVisionChange('safety')}
              className={`relative flex items-center gap-3 px-6 py-4 font-semibold transition-all ${
                activeVision === 'safety'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeVision === 'safety'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
                  : 'bg-gray-100'
              }`}>
                <Shield className={`w-5 h-5 ${activeVision === 'safety' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Industrial AI</div>
                <div className="text-xs opacity-75">Safety Vision</div>
              </div>
              {activeVision === 'safety' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-full"></div>
              )}
            </button>

            <button
              onClick={() => onVisionChange('quality')}
              className={`relative flex items-center gap-3 px-6 py-4 font-semibold transition-all ${
                activeVision === 'quality'
                  ? 'text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeVision === 'quality'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                  : 'bg-gray-100'
              }`}>
                <CheckCircle className={`w-5 h-5 ${activeVision === 'quality' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Industrial AI</div>
                <div className="text-xs opacity-75">Quality Vision</div>
              </div>
              {activeVision === 'quality' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-full"></div>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Active: {activeVision === 'safety' ? 'Safety Monitoring' : 'Quality Inspection'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
