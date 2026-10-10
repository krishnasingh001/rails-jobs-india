module Api
  module V1
    # Reads a resume during sign-up so the candidate can review the skills before saving.
    # The upload is analyzed in memory and never stored.
    class ResumeSkillsController < ApplicationController
      def create
        file = params[:resume]
        return render_error("Attach a PDF or DOCX resume.") unless file.respond_to?(:read)

        filename = File.basename(file.original_filename.to_s)
        return render_error("Please upload a PDF or DOCX resume.") unless filename.downcase.end_with?(".pdf", ".docx")

        extraction = Resume::TextExtractor.call(file.read(Resume::TextExtractor::MAX_BYTES + 1))
        render json: {
          success: true,
          skills: Resume::SkillExtractor.call(extraction.text),
          meta: { filename: filename, format: extraction.format, characters: extraction.text.length }
        }
      rescue Resume::TextExtractor::Error => e
        render_error(e.message)
      end

      private

      def render_error(message)
        render json: { success: false, message: message }, status: :unprocessable_entity
      end
    end
  end
end
