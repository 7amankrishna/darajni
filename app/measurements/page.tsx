'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';

export default function MeasurementGuide() {
  const [measurements, setMeasurements] = useState({
    bust: '',
    waist: '',
    hips: '',
    inseam: '',
    height: '',
    thigh: '',
  });

  const [activeField, setActiveField] = useState<keyof typeof measurements | null>(null);

  const handleSave = () => {
    // Validate inputs
    const missing = Object.entries(measurements).filter(([_, v]) => v.trim() === '').map(([k]) => k);
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    toast.success('Measurements saved! You can use these for your dress order.');
    // Optionally send to backend or store in localStorage
    localStorage.setItem('userMeasurements', JSON.stringify(measurements));
  };

  const handleInputChange = (field: keyof typeof measurements, e: React.ChangeEvent<HTMLInputElement>) => {
    setMeasurements(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-gray-50 py-8">
      <Toaster />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          How to Take Your Dress Measurements
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          Follow the illustrated guide below to take accurate measurements. Click on any
          highlighted area to input your measurement.
        </p>

        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          {/* Interactive Diagram */}
          <Card className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Measurement Diagram</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full h-[500px]">
                {/* Simple dress silhouette SVG */}
                <svg
                  className="w-full h-full"
                  viewBox="0 0 400 600"
                  aria-labelledby="title desc"
                >
                  <title id="title">Dress measurement guide</title>
                  <desc id="desc">
                    Illustrated guide showing where to measure bust, waist, hips, inseam, height,
                    and thigh.
                  </desc>

                  {/* Outline of a dress/figure */}
                  <path
                    d="M150 50 Q180 30 210 50 L220 80 Q230 120 220 160 L200 200 Q180 220 180 260 L170 300 Q160 340 170 380 L180 420 Q190 460 200 500 L200 520 L180 540 Q160 560 150 580 L120 560 Q100 540 80 520 L80 500 Q90 460 100 420 L110 380 Q120 340 110 300 L100 260 Q80 220 60 200 Q40 180 50 140 Q60 100 90 80 Z"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                  />

                  {/* Bust measurement line */}
                  <g
                    onClick={() => setActiveField('bust')}
                    cursor="pointer"
                    className="hover:cursor-pointer"
                  >
                    <line
                      x1="130"
                      y1="180"
                      x2="250"
                      y2="180"
                      stroke={activeField === 'bust' ? '#3b82f6' : '#60a5fa'}
                      strokeWidth={activeField === 'bust' ? 3 : 2}
                      strokeDasharray={activeField === 'bust' ? '0' : '4,2'}
                    />
                    <circle
                      cx="130"
                      cy="180"
                      r={4}
                      fill={activeField === 'bust' ? '#3b82f6' : '#60a5fa'}
                    />
                    <circle
                      cx="250"
                      cy="180"
                      r={4}
                      fill={activeField === 'bust' ? '#3b82f6' : '#60a5fa'}
                    />
                    <text
                      x="190"
                      y="160"
                      textAnchor="middle"
                      fontSize="12"
                      fill={activeField === 'bust' ? '#3b82f6' : '#60a5fa'}
                      fontWeight={activeField === 'bust' ? '600' : '400'}
                    >
                      Bust
                    </text>
                  </g>

                  {/* Waist measurement line */}
                  <g
                    onClick={() => setActiveField('waist')}
                    cursor="pointer"
                  >
                    <line
                      x1="130"
                      y1="240"
                      x2="250"
                      y2="240"
                      stroke={activeField === 'waist' ? '#10b981' : '#34d399'}
                      strokeWidth={activeField === 'waist' ? 3 : 2}
                      strokeDasharray={activeField === 'waist' ? '0' : '4,2'}
                    />
                    <circle
                      cx="130"
                      cy="240"
                      r={4}
                      fill={activeField === 'waist' ? '#10b981' : '#34d399'}
                    />
                    <circle
                      cx="250"
                      cy="240"
                      r={4}
                      fill={activeField === 'waist' ? '#10b981' : '#34d399'}
                    />
                    <text
                      x="190"
                      y="220"
                      textAnchor="middle"
                      fontSize="12"
                      fill={activeField === 'waist' ? '#10b981' : '#34d399'}
                      fontWeight={activeField === 'waist' ? '600' : '400'}
                    >
                      Waist
                    </text>
                  </g>

                  {/* Hips measurement line */}
                  <g
                    onClick={() => setActiveField('hips')}
                    cursor="pointer"
                  >
                    <line
                      x1="140"
                      y1="340"
                      x2="240"
                      y2="340"
                      stroke={activeField === 'hips' ? '#f59e0b' : '#fbbf24'}
                      strokeWidth={activeField === 'hips' ? 3 : 2}
                      strokeDasharray={activeField === 'hips' ? '0' : '4,2'}
                    />
                    <circle
                      cx="140"
                      cy="340"
                      r={4}
                      fill={activeField === 'hips' ? '#f59e0b' : '#fbbf24'}
                    />
                    <circle
                      cx="240"
                      cy="340"
                      r={4}
                      fill={activeField === 'hips' ? '#f59e0b' : '#fbbf24'}
                    />
                    <text
                      x="190"
                      y="320"
                      textAnchor="middle"
                      fontSize="12"
                      fill={activeField === 'hips' ? '#f59e0b' : '#fbbf24'}
                      fontWeight={activeField === 'hips' ? '600' : '400'}
                    >
                      Hips
                    </text>
                  </g>

                  {/* Inseam measurement line (inner leg) */}
                  <g
                    onClick={() => setActiveField('inseam')}
                    cursor="pointer"
                  >
                    <line
                      x1="190"
                      y1="380"
                      x2="190"
                      y2="520"
                      stroke={activeField === 'inseam' ? '#ef4444' : '#f87171'}
                      strokeWidth={activeField === 'inseam' ? 3 : 2}
                      strokeDasharray={activeField === 'inseam' ? '0' : '4,2'}
                    />
                    <circle
                      cx="190"
                      cy="380"
                      r={4}
                      fill={activeField === 'inseam' ? '#ef4444' : '#f87171'}
                    />
                    <circle
                      cx="190"
                      cy="520"
                      r={4}
                      fill={activeField === 'inseam' ? '#ef4444' : '#f87171'}
                    />
                    <text
                      x="210"
                      y="450"
                      textAnchor="start"
                      fontSize="12"
                      fill={activeField === 'inseam' ? '#ef4444' : '#f87171'}
                      fontWeight={activeField === 'inseam' ? '600' : '400'}
                    >
                      Inseam
                    </text>
                  </g>

                  {/* Height measurement line */}
                  <g
                    onClick={() => setActiveField('height')}
                    cursor="pointer"
                  >
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="580"
                      stroke={activeField === 'height' ? '#8b5cf6' : '#a78bfa'}
                      strokeWidth={activeField === 'height' ? 3 : 2}
                      strokeDasharray={activeField === 'height' ? '0' : '4,2'}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={4}
                      fill={activeField === 'height' ? '#8b5cf6' : '#a78bfa'}
                    />
                    <circle
                      cx="50"
                      cy="580"
                      r={4}
                      fill={activeField === 'height' ? '#8b5cf6' : '#a78bfa'}
                    />
                    <text
                      x="30"
                      y="315"
                      textAnchor="end"
                      fontSize="12"
                      fill={activeField === 'height' ? '#8b5cf6' : '#a78bfa'}
                      fontWeight={activeField === 'height' ? '600' : '400'}
                      transform="rotate(-90 30 315)"
                    >
                      Height
                    </text>
                  </g>

                  {/* Thigh measurement line */}
                  <g
                    onClick={() => setActiveField('thigh')}
                    cursor="pointer"
                  >
                    <line
                      x1="120"
                      y1="420"
                      x2="240"
                      y2="420"
                      stroke={activeField === 'thigh' ? '#ec4899' : '#f472b6'}
                      strokeWidth={activeField === 'thigh' ? 3 : 2}
                      strokeDasharray={activeField === 'thigh' ? '0' : '4,2'}
                    />
                    <circle
                      cx="120"
                      cy="420"
                      r={4}
                      fill={activeField === 'thigh' ? '#ec4899' : '#f472b6'}
                    />
                    <circle
                      cx="240"
                      cy="420"
                      r={4}
                      fill={activeField === 'thigh' ? '#ec4899' : '#f472b6'}
                    />
                    <text
                      x="180"
                      y="400"
                      textAnchor="middle"
                      fontSize="12"
                      fill={activeField === 'thigh' ? '#ec4899' : '#f472b6'}
                      fontWeight={activeField === 'thigh' ? '600' : '400'}
                    >
                      Thigh
                    </text>
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Input Panel */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {activeField ? (
                  <>
                    Enter {activeField.charAt(0).toUpperCase() + activeField.slice(1)} measurement
                  </>
                ) : (
                  'Select a measurement point'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeField ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`${activeField}-input`} className="font-medium">
                      {activeField.charAt(0).toUpperCase() + activeField.slice(1)} (inches or cm)
                    </Label>
                    <Input
                      id={`${activeField}-input`}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Enter measurement"
                      value={measurements[activeField] || ''}
                      onChange={e => handleInputChange(activeField, e)}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500">
                      Measure loosely without compressing the tissue.
                    </p>
                  </div>
                  <Button
                    onClick={handleSave}
                    className="w-full"
                    disabled={Object.values(measurements).some(v => v === '')}
                  >
                    Save Measurements
                  </Button>
                </>
              ) : (
                <p className="text-center text-gray-500">
                  Click on any highlighted area of the diagram above to begin.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Measurement Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h2 className="font-semibold text-lg">How to Measure:</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>
                <strong>Bust:</strong> Measure around the fullest part of your bust, keeping the
                tape parallel to the floor.
              </li>
              <li>
                <strong>Waist:</strong> Measure around your natural waistline, typically the
                narrowest part of your torso.
              </li>
              <li>
                <strong>Hips:</strong> Measure around the fullest part of your hips and buttocks.
              </li>
              <li>
                <strong>Inseam:</strong> Measure from the crotch to the bottom of your leg along
                the inner seam.
              </li>
              <li>
                <strong>Height:</strong> Stand barefoot against a wall, mark the top of your head,
                and measure from the floor to the mark.
              </li>
              <li>
                <strong>Thigh:</strong> Measure around the fullest part of your thigh, usually
                just below the crotch.
              </li>
            </ol>

            <h2 className="font-semibold text-lg mt-4">Tips for Accuracy:</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                Use a flexible measuring tape, preferably cloth or fiberglass.
              </li>
              <li>
                Wear thin clothing or measure over undergarments for best accuracy.
              </li>
              <li>
                Ensure the tape is snug but not tight; you should be able to slip a finger underneath.
                </li>
              <li>
                Stand naturally, without sucking in your stomach or holding your breath.
              </li>
              <li>
                If possible, have someone else take the measurements for you.
              </li>
            </ul>

            <p className="text-sm text-gray-500 mt-4">
              Keep your measurements saved in your profile for faster checkout when ordering custom
              dresses.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
