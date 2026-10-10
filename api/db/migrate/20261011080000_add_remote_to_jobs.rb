class AddRemoteToJobs < ActiveRecord::Migration[8.0]
  def up
    change_table :jobs, bulk: true do |t|
      t.boolean :remote
      t.string :remote_source
    end

    Job.reset_column_information
    Job.find_each do |job|
      remote, source = Serpapi::GoogleJob.remote_signal(job.raw, job.location)
      job.update_columns(remote: remote, remote_source: source)
    end
  end

  def down
    change_table :jobs, bulk: true do |t|
      t.remove :remote, :remote_source
    end
  end
end
