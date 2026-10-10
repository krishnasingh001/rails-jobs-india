module Api
  module V1
    class ResumeChecksController < ApplicationController
      before_action :require_user!, except: :create
      before_action :set_check, only: %i[show file destroy]

      def index
        checks = current_user.resume_checks.without_file.recent
        render json: { data: ResumeCheckBlueprint.render_as_hash(checks) }
      end

      def show
        render json: { data: @check.report, meta: ResumeCheckBlueprint.render_as_hash(@check) }
      end

      def file
        send_data @check.file_data, filename: @check.filename, type: @check.content_type, disposition: "attachment"
      end

      def destroy
        @check.destroy!
        render json: { success: true }
      end

      # Anyone can check a resume. When the caller is signed in, the file and report are kept in their history.
      def create
        file = params[:resume]
        unless file.respond_to?(:read)
          return render json: { success: false, message: "Attach a PDF or DOCX resume." }, status: :unprocessable_entity
        end

        filename = File.basename(file.original_filename.to_s)
        unless filename.downcase.end_with?(".pdf", ".docx")
          return render json: { success: false, message: "Please upload a PDF or DOCX resume." }, status: :unprocessable_entity
        end

        bytes = file.read(Resume::TextExtractor::MAX_BYTES + 1)
        extraction = Resume::TextExtractor.call(bytes)
        report = Resume::AtsChecker.call(extraction, filename: filename, target_role: params[:target_role].to_s.first(1000))
        saved = save_check(bytes, extraction, report, filename)

        render json: {
          success: true,
          data: report,
          meta: { id: saved&.id, saved: saved.present?, filename: filename, format: extraction.format, characters: extraction.text.length, bytes: bytes.bytesize }
        }
      rescue Resume::TextExtractor::Error => e
        render json: { success: false, message: e.message }, status: :unprocessable_entity
      end

      private

      def set_check
        @check = current_user.resume_checks.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { success: false, message: "Check not found." }, status: :not_found
      end

      def save_check(bytes, extraction, report, filename)
        return unless current_user

        current_user.resume_checks.create!(
          filename: filename,
          content_type: extraction.format == :pdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          byte_size: bytes.bytesize,
          file_data: bytes,
          target_role: report[:target_role],
          overall_score: report[:overall_score],
          summary: report[:summary],
          report: report
        )
      end
    end
  end
end
