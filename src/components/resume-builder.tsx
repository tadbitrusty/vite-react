'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const resumeSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    location: z.string().min(1, 'Location is required'),
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional(),
  }),
  summary: z.string().min(50, 'Summary should be at least 50 characters'),
  experience: z.array(z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company name is required'),
    location: z.string().min(1, 'Location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    description: z.string().min(1, 'Job description is required'),
  })),
  education: z.array(z.object({
    degree: z.string().min(1, 'Degree is required'),
    school: z.string().min(1, 'School name is required'),
    location: z.string().min(1, 'Location is required'),
    graduationDate: z.string().min(1, 'Graduation date is required'),
    gpa: z.string().optional(),
  })),
  skills: z.array(z.string().min(1, 'Skill cannot be empty')),
})

type ResumeData = z.infer<typeof resumeSchema>

export function ResumeBuilder() {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResumeData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
      },
      summary: '',
      experience: [{
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      }],
      education: [{
        degree: '',
        school: '',
        location: '',
        graduationDate: '',
        gpa: '',
      }],
      skills: [''],
    },
  })

  const onSubmit = async (data: ResumeData) => {
    setIsGenerating(true)
    try {
      // Here you would integrate with your backend API
      console.log('Resume data:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert('Resume generated successfully!')
    } catch (error) {
      console.error('Error generating resume:', error)
      alert('Error generating resume. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  {...register('personalInfo.fullName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
                {errors.personalInfo?.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.personalInfo.fullName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  {...register('personalInfo.email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
                {errors.personalInfo?.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.personalInfo.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  {...register('personalInfo.phone')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
                {errors.personalInfo?.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.personalInfo.phone.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  {...register('personalInfo.location')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New York, NY"
                />
                {errors.personalInfo?.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.personalInfo.location.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn
                </label>
                <input
                  {...register('personalInfo.linkedin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub
                </label>
                <input
                  {...register('personalInfo.github')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/johndoe"
                />
              </div>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Professional Summary</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary *
              </label>
              <textarea
                {...register('summary')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write a compelling professional summary highlighting your key achievements and skills..."
              />
              {errors.summary && (
                <p className="text-red-500 text-sm mt-1">{errors.summary.message}</p>
              )}
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-4">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            Step {step} of 5
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {renderStep()}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(Math.min(5, step + 1))}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Resume'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}