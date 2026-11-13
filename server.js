import os
from flask import Flask, request
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

TOKEN = os.environ.get("9213115853:AAHVDACnqSSOFXx3iy4KXv6FGhGfxhx82jc")
app = Flask(__name__)

# বট অ্যাপ্লিকেশন তৈরি করুন
application = Application.builder().token(TOKEN).build()

# আপনার হ্যান্ডলার ফাংশন এখানে লিখুন (যেমন /start, রিডিম কোড ইত্যাদি)
async def start(update: Update, context):
    await update.message.reply_text("বট চালু হয়েছে")

application.add_handler(CommandHandler("start", start))

# Flask রুট, Render হেলথ চেক এবং Webhook গ্রহণের জন্য
@app.route(f"/{TOKEN}", methods=["POST"])
def webhook():
    update = Update.de_json(request.get_json(force=True), application.bot)
    application.process_update(update)
    return "ok", 200

@app.route("/health")
def health():
    return "OK", 200

# গুরুত্বপূর্ণ: প্রথমবার চালানোর সময় Webhook সেট করুন
# URL আপনার Render সার্ভিসের পাবলিক ঠিকানা দিয়ে প্রতিস্থাপন করুন
if __name__ == "__main__":
    # রেন্ডার প্রথমবার চালানোর সময় ওয়েবহুক স্বয়ংক্রিয়ভাবে সেট করতে পারে, অথবা ম্যানুয়ালি একবার কল করতে পারে
    # application.bot.set_webhook(url=f"https://your-app.onrender.com/{TOKEN}")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
